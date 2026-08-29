import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Document } from '../ged/entities/document.entity';
import { GedStorageService, type FichierEntrant } from '../ged/ged-storage.service';
import { MissionsService } from './missions.service';
import { Mission } from './entities/mission.entity';

export type RoleDocumentMission = 'ordre_mission' | 'compte_rendu' | 'pv' | 'depense';
const ROLES: RoleDocumentMission[] = ['ordre_mission', 'compte_rendu', 'pv', 'depense'];

export interface AjouterDocumentMissionData {
  missionId: string;
  titre: string;
  role: RoleDocumentMission;
  description?: string | null;
  depenseId?: string | null;
}

// Portage de app.fn_ajouter_document_mission (0077). Comme pour Projets, bypasse
// la permission GED classique : can_modifier_mission suffit, pas ged/creer — le
// document créé ici a created_by = user.id, donc GedDocumentsService.canView/
// assertModifiable passent sans changement pour l'appelant immédiat
// (voir ProjetsDocumentsService, même patron).
@Injectable()
export class MissionsDocumentsService {
  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly missionsService: MissionsService,
    private readonly storageService: GedStorageService,
  ) {}

  async listByMission(missionId: string, user: AuthenticatedUser): Promise<Document[]> {
    await this.missionsService.findOne(missionId, user);
    return this.documents.find({ where: { missionId, supprimeLe: IsNull() }, order: { createdAt: 'DESC' } });
  }

  private async ajouterDocument(data: AjouterDocumentMissionData, user: AuthenticatedUser): Promise<Document> {
    if (!ROLES.includes(data.role)) {
      throw new BadRequestException(`Rôle de document invalide: ${data.role}`);
    }
    const mission = await this.missionsService.findOne(data.missionId, user);
    if (!(await this.missionsService.canModifier(mission, user))) {
      throw new ForbiddenException(`Permission refusée sur la mission ${data.missionId}`);
    }

    if (data.role === 'depense') {
      if (!data.depenseId) {
        throw new BadRequestException("p_depense_id requis pour le rôle 'depense'");
      }
      const rows = await this.dataSource.query('select 1 from mission_depenses where id = $1 and mission_id = $2', [
        data.depenseId,
        data.missionId,
      ]);
      if (rows.length === 0) {
        throw new BadRequestException(`Dépense ${data.depenseId} n'appartient pas à la mission ${data.missionId}`);
      }
    }

    const document = await this.documents.save(
      this.documents.create({
        organisationId: mission.organisationId,
        missionId: data.missionId,
        entiteId: mission.entiteId,
        titre: data.titre,
        description: data.description ?? null,
        dateVersement: new Date(),
        createdBy: user.id,
      }),
    );

    if (data.role === 'ordre_mission') {
      await this.dataSource.manager.update(Mission, data.missionId, { ordreMissionDocumentId: document.id });
    } else if (data.role === 'compte_rendu') {
      await this.dataSource.manager.update(Mission, data.missionId, { compteRenduDocumentId: document.id });
    } else if (data.role === 'pv') {
      await this.dataSource.manager.update(Mission, data.missionId, { pvDocumentId: document.id });
    } else if (data.role === 'depense') {
      await this.dataSource.query('update mission_depenses set justificatif_document_id = $1 where id = $2', [
        document.id,
        data.depenseId,
      ]);
    }

    return document;
  }

  // Compose fn_ajouter_document_mission + fn_verser_version_document, avec le
  // même repli "supprimer le document orphelin si l'upload échoue" que le
  // frontend actuel (ajouterDocumentMissionAvecFichier, services/missions/documents.ts).
  async ajouterDocumentAvecFichier(
    data: AjouterDocumentMissionData,
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
