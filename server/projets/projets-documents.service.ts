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
      await this.storageService.verserVersion(document.id, fichier, null, user);
    } catch (err) {
      await this.documents.delete(document.id);
      throw err;
    }
    const rechargé = await this.documents.findOneBy({ id: document.id });
    if (!rechargé) throw new NotFoundException('Document introuvable');
    return rechargé;
  }
}
