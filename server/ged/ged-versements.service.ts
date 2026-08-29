import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowEtape } from '../workflow/entities/workflow-etape.entity';
import { WorkflowInstance } from '../workflow/entities/workflow-instance.entity';
import { Document } from './entities/document.entity';
import { GedVersement } from './entities/ged-versement.entity';
import { versementVersContexte } from './ged-versement-contexte.util';

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
  ) {}

  async canView(versement: GedVersement, user: AuthenticatedUser): Promise<boolean> {
    if (versement.organisationId !== user.organisationId) return false;
    if (versement.redacteurId === user.id) return true;
    return this.authorizationService.hasPermission(user.id, 'ged', 'consulter', versement.entiteId);
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<GedVersement> {
    const versement = await this.versements.findOneBy({ id });
    if (!versement || !(await this.canView(versement, user))) {
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
    const entiteId = data.entiteId ?? null;
    if (!(await this.authorizationService.hasPermission(user.id, 'ged', 'creer', entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à créer un versement pour cette entité");
    }
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
    const autorise =
      (versement.redacteurId === user.id && versement.brouillon) ||
      (await this.authorizationService.hasPermission(user.id, 'ged', 'modifier', versement.entiteId));
    if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce versement");

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
        (await this.authorizationService.hasPermission(user.id, 'ged', 'modifier', versement.entite_id));
      if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à soumettre ce versement");

      const nbDocuments = await manager.count(Document, { where: { versementId: id } });
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
      const autorise =
        versement.redacteurId === user.id ||
        (await this.authorizationService.hasPermission(user.id, 'ged', 'consulter', versement.entiteId));
      if (!autorise) continue;

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
