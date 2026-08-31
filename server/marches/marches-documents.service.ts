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
      await this.storageService.verserVersion(document.id, fichier, null, user);
    } catch (err) {
      await this.documents.delete(document.id);
      throw err;
    }
    const recharge = await this.documents.findOneBy({ id: document.id });
    if (!recharge) throw new NotFoundException('Document introuvable');
    return recharge;
  }
}
