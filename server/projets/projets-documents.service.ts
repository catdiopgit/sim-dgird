import * as path from 'path';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Document } from '../ged/entities/document.entity';
import { GedStorageService, type FichierEntrant } from '../ged/ged-storage.service';
import { ProjetsService } from './projets.service';

export interface AjouterDocumentProjetData {
  projetId: string;
  titre: string;
  description?: string | null;
  typeProjetValeurId?: string | null;
  livrableId?: string | null;
  avenantId?: string | null;
  decaissementId?: string | null;
}

// Portage de app.fn_ajouter_document_projet (0073, dernier corps — inclut
// p_decaissement_id). Bypasse la permission GED classique (ged/creer) : un
// contributeur projet doit pouvoir déposer les pièces de son projet sans
// droit GED — même logique que can_modifier_projet, pas hasPermission('ged',...).
// L'upload du fichier réutilise GedStorageService.verserVersion (Phase 4) tel
// quel : le document vient d'être créé par l'appelant (created_by = user.id),
// donc son canView/assertModifiable passent sans changement.
@Injectable()
export class ProjetsDocumentsService {
  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly projetsService: ProjetsService,
    private readonly storageService: GedStorageService,
  ) {}

  async listByProjet(projetId: string, user: AuthenticatedUser): Promise<Document[]> {
    await this.projetsService.findOne(projetId, user);
    return this.documents.find({
      where: { projetId, supprimeLe: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async listByLivrable(livrableId: string, user: AuthenticatedUser): Promise<Document[]> {
    const documents = await this.documents.find({
      where: { livrableId, supprimeLe: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (documents[0]?.projetId) await this.projetsService.findOne(documents[0].projetId, user);
    return documents;
  }

  private async ajouterDocument(data: AjouterDocumentProjetData, user: AuthenticatedUser): Promise<Document> {
    const projet = await this.projetsService.findOne(data.projetId, user);
    if (!(await this.projetsService.canModifier(projet, user))) {
      throw new ForbiddenException(`Permission refusée sur le projet ${data.projetId}`);
    }

    if (data.livrableId) {
      const rows = await this.dataSource.query('select 1 from livrables where id = $1 and projet_id = $2', [
        data.livrableId,
        data.projetId,
      ]);
      if (rows.length === 0) {
        throw new BadRequestException(`Livrable ${data.livrableId} n'appartient pas au projet ${data.projetId}`);
      }
    }
    if (data.avenantId) {
      const rows = await this.dataSource.query('select 1 from avenants where id = $1 and projet_id = $2', [
        data.avenantId,
        data.projetId,
      ]);
      if (rows.length === 0) {
        throw new BadRequestException(`Avenant ${data.avenantId} n'appartient pas au projet ${data.projetId}`);
      }
    }
    if (data.decaissementId) {
      const rows = await this.dataSource.query('select 1 from decaissements where id = $1 and projet_id = $2', [
        data.decaissementId,
        data.projetId,
      ]);
      if (rows.length === 0) {
        throw new BadRequestException(`Décaissement ${data.decaissementId} n'appartient pas au projet ${data.projetId}`);
      }
    }

    return this.documents.save(
      this.documents.create({
        organisationId: projet.organisationId,
        projetId: data.projetId,
        livrableId: data.livrableId ?? null,
        avenantId: data.avenantId ?? null,
        decaissementId: data.decaissementId ?? null,
        entiteId: projet.entiteId,
        titre: data.titre,
        description: data.description ?? null,
        typeProjetValeurId: data.typeProjetValeurId ?? null,
        dateVersement: new Date(),
        createdBy: user.id,
      }),
    );
  }

  // Compose fn_ajouter_document_projet + fn_verser_version_document, avec le
  // même repli "supprimer le document orphelin si l'upload échoue" que le
  // frontend actuel (ajouterDocumentProjetAvecFichier, services/projets/documents.ts).
  async ajouterDocumentAvecFichier(
    data: AjouterDocumentProjetData,
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
    const rechargé = await this.documents.findOneBy({ id: document.id });
    if (!rechargé) throw new NotFoundException('Document introuvable');
    return rechargé;
  }

  // Évolution D (recette 2026-11) : nommage normalisé sur le modèle du courrier,
  // à partir du code du projet. Exemples :
  //   PRJ-2026-01_Contrat.pdf, PRJ-2026-01_TDR.pdf, PRJ-2026-01_Ordre_de_service.pdf
  //   PRJ-2026-01_L2_Justificatif.pdf   (justificatif du 2e livrable)
  //   PRJ-2026-01_AV1_Avenant.pdf       (1er avenant)
  //   PRJ-2026-01_DEC3_Justificatif.pdf (3e décaissement)
  // Un 2e fichier pour la même pièce reçoit un suffixe : …_Contrat_2.pdf.
  // Le titre saisi reste le libellé affiché ; seul le nom du fichier change.
  private async nomNormalise(document: Document, nomOriginal: string): Promise<string> {
    const ascii = (texte: string) =>
      texte
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.\-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    const recode = Buffer.from(nomOriginal, 'latin1').toString('utf8');
    const ext = path
      .extname(recode.includes('\uFFFD') ? nomOriginal : recode)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');

    const projets: Array<{ code: string }> = await this.dataSource.query('select code from projets where id = $1', [
      document.projetId,
    ]);
    const base = ascii(projets[0]?.code || document.projetId || 'PROJET');

    const rang = async (table: 'livrables' | 'avenants' | 'decaissements', id: string): Promise<number> => {
      const rows: Array<{ n: number }> = await this.dataSource.query(
        `select n from (select id, row_number() over (order by created_at, id)::int as n
                        from ${table} where projet_id = $1) t where id = $2`,
        [document.projetId, id],
      );
      return rows[0]?.n ?? 1;
    };

    let piece: string;
    // Colonne qui identifie « la même pièce » pour numéroter les doublons.
    let memePiece: { colonne: string; valeur: string | null };
    if (document.livrableId) {
      piece = `L${await rang('livrables', document.livrableId)}_Justificatif`;
      memePiece = { colonne: 'livrable_id', valeur: document.livrableId };
    } else if (document.avenantId) {
      piece = `AV${await rang('avenants', document.avenantId)}_Avenant`;
      memePiece = { colonne: 'avenant_id', valeur: document.avenantId };
    } else if (document.decaissementId) {
      piece = `DEC${await rang('decaissements', document.decaissementId)}_Justificatif`;
      memePiece = { colonne: 'decaissement_id', valeur: document.decaissementId };
    } else {
      const types: Array<{ code: string; libelle: string }> = document.typeProjetValeurId
        ? await this.dataSource.query('select code, libelle from valeurs_listes where id = $1', [document.typeProjetValeurId])
        : [];
      const type = types[0];
      // Type « Autre » ou absent : le titre saisi sert de nom de pièce.
      piece = ascii(type && type.code !== 'autre' ? type.libelle : document.titre).slice(0, 60) || 'Document';
      memePiece =
        document.typeProjetValeurId && type?.code !== 'autre'
          ? { colonne: 'type_projet_valeur_id', valeur: document.typeProjetValeurId }
          : { colonne: 'titre', valeur: document.titre };
    }

    const rows: Array<{ n: number }> = await this.dataSource.query(
      `select count(*)::int as n from documents
       where projet_id = $1 and supprime_le is null and id <> $2
         and ${memePiece.colonne}::text = $3::text`,
      [document.projetId, document.id, memePiece.valeur],
    );
    const n = (rows[0]?.n ?? 0) + 1;
    return `${base}_${piece}${n > 1 ? `_${n}` : ''}${ext}`;
  }
}
