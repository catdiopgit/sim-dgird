import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowEtape } from '../workflow/entities/workflow-etape.entity';
import { WorkflowInstance } from '../workflow/entities/workflow-instance.entity';
import { Document } from './entities/document.entity';
import { GedVersement } from './entities/ged-versement.entity';
import { versementVersContexte } from './ged-versement-contexte.util';
import { GedAccesService } from './ged-acces.service';
import { GedNotificationsService } from './ged-notifications.service';
import { getStorageRoot } from '../config/storage.config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface CreerVersementData {
  objet: string;
  entiteId?: string | null;
  dossierCibleId?: string | null;
  description?: string | null;
}

export interface ModifierVersementData {
  objet?: string;
  description?: string | null;
  entiteId?: string | null;
  dossierCibleId?: string | null;
}

// Portage de app.fn_creer_versement, app.fn_soumettre_versement,
// app.fn_bannette_ged. La partie workflow (transitions/exécution) vit dans
// GedWorkflowService, qui dépend de ce service pour canView/findOne.
@Injectable()
export class GedVersementsService {
  constructor(
    @InjectRepository(GedVersement) private readonly versements: Repository<GedVersement>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly acces: GedAccesService,
    private readonly gedNotifications: GedNotificationsService,
  ) {}

  // v8.6 : le déposant, l'archiviste, le responsable de l'entité (ou d'une
  // entité parente), et les rôles ayant « GED / consulter » sur une portée
  // étendue. La portée « personnel » ne couvre plus que ses propres versements.
  async canView(versement: GedVersement, user: AuthenticatedUser): Promise<boolean> {
    if (versement.organisationId !== user.organisationId) return false;
    if (versement.redacteurId === user.id) return true;
    if (await this.acces.estArchiviste(user.id)) return true;
    if (await this.acces.estResponsableHierarchique(versement.entiteId, user.id)) return true;
    return this.authorizationService.hasPermissionEtendue(user.id, 'ged', 'consulter', versement.entiteId);
  }

  // Brouillon : le déposant (ou « GED / modifier » étendu sur l'entité).
  // Une fois soumis : l'archiviste seul.
  async peutModifier(versement: GedVersement, user: AuthenticatedUser): Promise<boolean> {
    if (await this.acces.estArchiviste(user.id)) return true;
    if (!versement.brouillon) return false;
    if (versement.redacteurId === user.id) return true;
    return this.authorizationService.hasPermissionEtendue(user.id, 'ged', 'modifier', versement.entiteId);
  }

  private async assertDossierCible(dossierCibleId: string | null | undefined, user: AuthenticatedUser): Promise<void> {
    if (!dossierCibleId) return;
    const rows: Array<{ actif: boolean; organisation_id: string }> = await this.dataSource.query(
      'select actif, organisation_id from ged_dossiers where id = $1 and supprime_le is null',
      [dossierCibleId],
    );
    if (!rows[0] || rows[0].organisation_id !== user.organisationId) throw new NotFoundException('Dossier introuvable');
    if (!rows[0].actif) throw new BadRequestException('Ce dossier du plan de classement est désactivé');
    if (!(await this.acces.peutProposerDossier(dossierCibleId, user))) {
      throw new ForbiddenException(
        "Cette série du plan de classement est réservée à d'autres entités : choisissez une série de votre entité",
      );
    }
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<GedVersement> {
    const versement = await this.versements.findOneBy({ id });
    if (!versement || versement.supprimeLe || !(await this.canView(versement, user))) {
      throw new NotFoundException('Versement introuvable');
    }
    return versement;
  }

  async findAll(user: AuthenticatedUser, brouillonsSeulement = false): Promise<GedVersement[]> {
    const versements = await this.versements.find({
      where: { organisationId: user.organisationId, ...(brouillonsSeulement ? { brouillon: true } : {}) },
      order: { updatedAt: 'DESC' },
    });
    const resultats: GedVersement[] = [];
    for (const versement of versements) {
      if (versement.supprimeLe) continue;
      if (await this.canView(versement, user)) resultats.push(versement);
    }
    return resultats;
  }

  async create(data: CreerVersementData, user: AuthenticatedUser): Promise<GedVersement> {
    // v8.6 : par défaut le versement est rattaché à l'entité du déposant ; la
    // portée « personnel » ne permet de verser que pour sa propre entité.
    const entiteId = data.entiteId ?? user.entiteId ?? null;
    const autorise =
      (await this.authorizationService.hasPermissionEtendue(user.id, 'ged', 'creer', entiteId)) ||
      (entiteId === (user.entiteId ?? null) &&
        (await this.authorizationService.hasPermission(user.id, 'ged', 'creer', entiteId)));
    if (!autorise) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à créer un versement pour cette entité");
    }
    await this.assertDossierCible(data.dossierCibleId, user);
    return this.versements.save(
      this.versements.create({
        organisationId: user.organisationId,
        entiteId,
        dossierCibleId: data.dossierCibleId ?? null,
        objet: data.objet,
        description: data.description ?? null,
        brouillon: true,
        redacteurId: user.id,
      }),
    );
  }

  async update(id: string, data: ModifierVersementData, user: AuthenticatedUser): Promise<GedVersement> {
    const versement = await this.findOne(id, user);
    if (!(await this.peutModifier(versement, user))) {
      throw new ForbiddenException(
        versement.brouillon
          ? "Vous n'êtes pas autorisé à modifier ce versement"
          : "Ce versement est en cours d'examen : seul l'archiviste peut le modifier",
      );
    }
    if (data.dossierCibleId !== undefined && data.dossierCibleId !== versement.dossierCibleId) {
      await this.assertDossierCible(data.dossierCibleId, user);
    }

    await this.versements.update(id, {
      objet: data.objet ?? versement.objet,
      description: data.description !== undefined ? data.description : versement.description,
      entiteId: data.entiteId !== undefined ? data.entiteId : versement.entiteId,
      dossierCibleId: data.dossierCibleId !== undefined ? data.dossierCibleId : versement.dossierCibleId,
    });
    return this.findOne(id, user);
  }

  // Portage de app.fn_soumettre_versement — verrou FOR UPDATE + démarrage de
  // workflow composé dans la même transaction (WorkflowEngineService.demarrerWorkflow
  // accepte le manager pour cette raison, voir MIGRATION.md Phase 3).
  async soumettre(id: string, user: AuthenticatedUser): Promise<GedVersement> {
    return this.dataSource.transaction(async (manager) => {
      const rows: Array<{
        id: string;
        organisation_id: string;
        entite_id: string | null;
        brouillon: boolean;
        redacteur_id: string | null;
      }> = await manager.query('select * from ged_versements where id = $1 for update', [id]);
      const versement = rows[0];
      if (!versement || versement.organisation_id !== user.organisationId) {
        throw new NotFoundException('Versement introuvable');
      }
      if (!versement.brouillon) throw new BadRequestException('Ce versement est déjà soumis');

      const autorise =
        versement.redacteur_id === user.id ||
        (await this.authorizationService.hasPermissionEtendue(user.id, 'ged', 'modifier', versement.entite_id));
      if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à soumettre ce versement");

      const nbDocuments = await manager.count(Document, { where: { versementId: id, supprimeLe: IsNull() } });
      if (nbDocuments === 0) throw new BadRequestException('Ce versement ne contient aucun document');

      const workflowInstanceId = await this.workflowEngineService.demarrerWorkflow(
        'ged',
        user.organisationId,
        user.id,
        null,
        manager,
      );
      const instance = await manager.findOneByOrFail(WorkflowInstance, { id: workflowInstanceId });
      const etape = await manager.findOneByOrFail(WorkflowEtape, { id: instance.etapeCouranteId });

      await manager.update(GedVersement, id, {
        brouillon: false,
        workflowInstanceId: instance.id,
        etapeCode: etape.code,
        etapeLibelle: etape.libelle,
      });
      return manager.findOneByOrFail(GedVersement, { id });
    }).then(async (versement) => {
      const archivistes = await this.acces.archivistes(versement.organisationId);
      await this.gedNotifications.notifier(archivistes, {
        titre: 'Nouveau versement à archiver',
        message: `« ${versement.objet} » a été soumis et attend votre réception.`,
        versementId: versement.id,
        auteurId: user.id,
      });
      return versement;
    });
  }

  // v8.6 : retirer un document d'un brouillon (fichiers compris).
  async retirerDocument(versementId: string, documentId: string, user: AuthenticatedUser): Promise<void> {
    const versement = await this.findOne(versementId, user);
    if (!versement.brouillon) throw new BadRequestException('Seul un brouillon peut être modifié');
    if (!(await this.peutModifier(versement, user))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce versement");
    }
    const document = await this.documents.findOneBy({ id: documentId, versementId });
    if (!document) throw new NotFoundException('Document introuvable dans ce versement');

    const chemins: Array<{ storage_path: string }> = await this.dataSource.transaction(async (m) => {
      const versions: Array<{ storage_path: string }> = await m.query(
        'select storage_path from document_versions where document_id = $1',
        [documentId],
      );
      await m.query('update documents set version_courante_id = null where id = $1', [documentId]);
      await m.query('delete from ged_consultations where document_id = $1', [documentId]);
      await m.query('delete from document_droits where document_id = $1', [documentId]);
      await m.query('delete from document_versions where document_id = $1', [documentId]);
      await m.query('delete from documents where id = $1', [documentId]);
      return versions;
    });
    const racine = path.resolve(getStorageRoot(), 'ged');
    for (const { storage_path } of chemins) {
      const absolu = path.resolve(racine, storage_path);
      if (absolu.startsWith(racine + path.sep)) await fs.unlink(absolu).catch(() => undefined);
    }
  }

  // v8.6 : annuler un brouillon (conservé en base, masqué partout).
  async annuler(id: string, user: AuthenticatedUser): Promise<void> {
    const versement = await this.findOne(id, user);
    if (!versement.brouillon) throw new BadRequestException('Seul un brouillon peut être annulé');
    if (!(await this.peutModifier(versement, user))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à annuler ce versement");
    }
    await this.dataSource.transaction(async (m) => {
      await m.query('update ged_versements set supprime_le = now() where id = $1', [id]);
      await m.query('update documents set supprime_le = now() where versement_id = $1 and supprime_le is null', [id]);
    });
  }

  // --- Bannette (portage de app.fn_bannette_ged) ---

  async findATraiter(user: AuthenticatedUser): Promise<GedVersement[]> {
    const candidats = await this.versements.find({
      where: { organisationId: user.organisationId, brouillon: false },
    });
    const resultats: GedVersement[] = [];
    for (const versement of candidats) {
      if (versement.supprimeLe || !versement.workflowInstanceId) continue;
      if (!(await this.canView(versement, user))) continue;

      const instance = await this.dataSource.manager.findOneBy(WorkflowInstance, { id: versement.workflowInstanceId });
      if (!instance || instance.statutInstance !== 'en_cours') continue;

      const transitions = await this.workflowEngineService.transitionsDisponibles(
        instance.workflowDefinitionId,
        instance.etapeCouranteId,
        user.id,
        versement.entiteId,
        versementVersContexte(versement),
      );
      if (transitions.length > 0) resultats.push(versement);
    }
    return resultats;
  }
}
