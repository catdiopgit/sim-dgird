import * as path from 'path';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Document } from '../ged/entities/document.entity';
import { GedStorageService, type FichierEntrant } from '../ged/ged-storage.service';
import { MarchesService } from './marches.service';

export interface AjouterDocumentMarcheData {
  marcheId: string;
  titre: string;
  description?: string | null;
  typeMarcheValeurId?: string | null;
  phaseMarcheId?: string | null;
  marcheCandidatId?: string | null;
}

// §9/§12/§15 : pièces jointes du marché (documents de procédure, justificatifs
// de phase, offres des candidats) — même patron que ProjetsDocumentsService :
// bypasse la permission GED classique au profit de MarchesService.canModifier,
// puis délègue l'upload à GedStorageService.verserVersion inchangé.
@Injectable()
export class MarchesDocumentsService {
  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly marchesService: MarchesService,
    private readonly storageService: GedStorageService,
  ) {}

  async listByMarche(marcheId: string, user: AuthenticatedUser): Promise<Document[]> {
    await this.marchesService.findOne(marcheId, user);
    return this.documents.find({ where: { marcheId, supprimeLe: IsNull() }, order: { createdAt: 'DESC' } });
  }

  async listByPhase(phaseMarcheId: string, user: AuthenticatedUser): Promise<Document[]> {
    const documents = await this.documents.find({
      where: { phaseMarcheId, supprimeLe: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (documents[0]?.marcheId) await this.marchesService.findOne(documents[0].marcheId, user);
    return documents;
  }

  async listByCandidat(marcheCandidatId: string, user: AuthenticatedUser): Promise<Document[]> {
    const documents = await this.documents.find({
      where: { marcheCandidatId, supprimeLe: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (documents[0]?.marcheId) await this.marchesService.findOne(documents[0].marcheId, user);
    return documents;
  }

  private async ajouterDocument(data: AjouterDocumentMarcheData, user: AuthenticatedUser): Promise<Document> {
    const marche = await this.marchesService.findOne(data.marcheId, user);
    if (!(await this.marchesService.canModifier(marche, user))) {
      throw new ForbiddenException(`Permission refusée sur le marché ${data.marcheId}`);
    }

    if (data.phaseMarcheId) {
      const rows = await this.dataSource.query('select 1 from phases_marche where id = $1 and marche_id = $2', [
        data.phaseMarcheId,
        data.marcheId,
      ]);
      if (rows.length === 0) {
        throw new BadRequestException(`Phase ${data.phaseMarcheId} n'appartient pas au marché ${data.marcheId}`);
      }
    }
    if (data.marcheCandidatId) {
      const rows = await this.dataSource.query('select 1 from marche_candidats where id = $1 and marche_id = $2', [
        data.marcheCandidatId,
        data.marcheId,
      ]);
      if (rows.length === 0) {
        throw new BadRequestException(`Candidat ${data.marcheCandidatId} n'appartient pas au marché ${data.marcheId}`);
      }
    }

    return this.documents.save(
      this.documents.create({
        organisationId: marche.organisationId,
        marcheId: data.marcheId,
        phaseMarcheId: data.phaseMarcheId ?? null,
        marcheCandidatId: data.marcheCandidatId ?? null,
        entiteId: marche.entiteId,
        titre: data.titre,
        description: data.description ?? null,
        typeMarcheValeurId: data.typeMarcheValeurId ?? null,
        dateVersement: new Date(),
        createdBy: user.id,
      }),
    );
  }

  async ajouterDocumentAvecFichier(
    data: AjouterDocumentMarcheData,
    fichier: FichierEntrant,
    user: AuthenticatedUser,
  ): Promise<Document> {
    const document = await this.ajouterDocument(data, user);
    try {
      const nomFichier = await this.nomNormalise(document, fichier.originalname);
      await this.storageService.verserVersion(document.id, { ...fichier, originalname: nomFichier }, null, user);
    } catch (err) {
      await this.documents.delete(document.id);
      throw err;
    }
    const recharge = await this.documents.findOneBy({ id: document.id });
    if (!recharge) throw new NotFoundException('Document introuvable');
    return recharge;
  }

  // Évolution D (recette 2026-11) : nommage normalisé à partir de la référence
  // du marché, sur le modèle des projets. Exemples :
  //   AOO-2026-01_P2_Publication_avis.pdf   (justificatif de la phase 2)
  //   AOO-2026-01_Offre_SOGEA_SATOM.pdf      (pièce d'un candidat)
  //   AOO-2026-01_Contrat.pdf                (type de document, sinon le titre)
  // Un 2e fichier pour la même pièce reçoit un suffixe : …_2.pdf.
  private async nomNormalise(document: Document, nomOriginal: string): Promise<string> {
    const ascii = (texte: string) =>
      texte
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    const recode = Buffer.from(nomOriginal, 'latin1').toString('utf8');
    const ext = path
      .extname(recode.includes('\uFFFD') ? nomOriginal : recode)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    const marches: Array<{ reference: string }> = await this.dataSource.query('select reference from marches where id = $1', [
      document.marcheId,
    ]);
    const base = ascii(marches[0]?.reference || 'MARCHE');

    let piece: string;
    let memePiece: { colonne: string; valeur: string | null };
    if (document.phaseMarcheId) {
      const phases: Array<{ ordre: number; nom: string }> = await this.dataSource.query(
        'select ordre, nom from phases_marche where id = $1',
        [document.phaseMarcheId],
      );
      piece = `P${phases[0]?.ordre ?? ''}_${ascii(phases[0]?.nom ?? 'Phase').slice(0, 40)}`;
      memePiece = { colonne: 'phase_marche_id', valeur: document.phaseMarcheId };
    } else if (document.marcheCandidatId) {
      const candidats: Array<{ nom: string }> = await this.dataSource.query('select nom from marche_candidats where id = $1', [
        document.marcheCandidatId,
      ]);
      piece = `Offre_${ascii(candidats[0]?.nom ?? 'Candidat').slice(0, 40)}`;
      memePiece = { colonne: 'marche_candidat_id', valeur: document.marcheCandidatId };
    } else {
      const types: Array<{ code: string; libelle: string }> = document.typeMarcheValeurId
        ? await this.dataSource.query('select code, libelle from valeurs_listes where id = $1', [document.typeMarcheValeurId])
        : [];
      const type = types[0];
      piece = ascii(type && type.code !== 'autre' ? type.libelle : document.titre).slice(0, 60) || 'Document';
      memePiece =
        document.typeMarcheValeurId && type?.code !== 'autre'
          ? { colonne: 'type_marche_valeur_id', valeur: document.typeMarcheValeurId }
          : { colonne: 'titre', valeur: document.titre };
    }
    const rows: Array<{ n: number }> = await this.dataSource.query(
      `select count(*)::int as n from documents
       where marche_id = $1 and supprime_le is null and id <> $2 and ${memePiece.colonne}::text = $3::text`,
      [document.marcheId, document.id, memePiece.valeur],
    );
    const n = (rows[0]?.n ?? 0) + 1;
    return `${base}_${piece}${n > 1 ? `_${n}` : ''}${ext}`;
  }
}
