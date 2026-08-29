import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { ParametrageService } from '../administration/parametrage/parametrage.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowEtape } from '../workflow/entities/workflow-etape.entity';
import { WorkflowInstance } from '../workflow/entities/workflow-instance.entity';
import { Mission } from './entities/mission.entity';

export interface CreerMissionData {
  entiteId: string;
  objet: string;
  dateDepart: string;
  dateRetour: string;
  responsableId?: string | null;
  lieu?: string | null;
  objectifs?: string | null;
  activitesPrevues?: string | null;
  budgetPrevu?: number | null;
}

export interface UpdateMissionData {
  entiteId?: string;
  objet?: string;
  dateDepart?: string;
  dateRetour?: string;
  responsableId?: string | null;
  lieu?: string | null;
  objectifs?: string | null;
  activitesPrevues?: string | null;
  budgetPrevu?: number | null;
  recommandations?: string | null;
}

// Portage de app.can_view_mission / app.can_modifier_mission (0016/0077) et de
// app.fn_creer_mission (0077, dernier corps).
@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission) private readonly missions: Repository<Mission>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
    private readonly parametrageService: ParametrageService,
    private readonly workflowEngineService: WorkflowEngineService,
  ) {}

  async canView(mission: Mission, user: AuthenticatedUser): Promise<boolean> {
    if (mission.organisationId !== user.organisationId) return false;
    if (mission.entiteId === user.entiteId || mission.responsableId === user.id) return true;
    if (await this.authorizationService.hasPermission(user.id, 'missions', 'consulter', mission.entiteId)) return true;
    return this.estParticipant(mission.id, user.id);
  }

  // §mission_participants_write/actions_suivi_write/depenses_write (0016) :
  // responsable de la mission, ou permission missions/modifier.
  async canModifier(mission: Mission, user: AuthenticatedUser): Promise<boolean> {
    if (mission.organisationId !== user.organisationId) return false;
    if (mission.responsableId === user.id) return true;
    return this.authorizationService.hasPermission(user.id, 'missions', 'modifier', mission.entiteId);
  }

  async assertModifiable(mission: Mission, user: AuthenticatedUser): Promise<void> {
    if (!(await this.canModifier(mission, user))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette mission");
    }
  }

  private async estParticipant(missionId: string, utilisateurId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      'select 1 from mission_participants where mission_id = $1 and utilisateur_id = $2 limit 1',
      [missionId, utilisateurId],
    );
    return rows.length > 0;
  }

  // --- Lecture ---

  async findOne(id: string, user: AuthenticatedUser): Promise<Mission> {
    const mission = await this.missions.findOneBy({ id });
    if (!mission || !(await this.canView(mission, user))) {
      throw new NotFoundException('Mission introuvable');
    }
    return mission;
  }

  async findAll(user: AuthenticatedUser): Promise<Mission[]> {
    const missions = await this.missions.find({
      where: { organisationId: user.organisationId },
      order: { dateDepart: 'DESC' },
    });
    const resultats: Mission[] = [];
    for (const mission of missions) {
      if (await this.canView(mission, user)) resultats.push(mission);
    }
    return resultats;
  }

  // --- Écriture ---

  // Numérotation + démarrage du workflow composés dans une seule transaction,
  // même patron que CourriersService.create (Phase 3) — sinon deux transactions
  // séparées, non atomiques l'une avec l'autre.
  //
  // Bug réel trouvé en test (2026-08-29) : un entiteId inexistant passait la
  // vérification hasPermission (portée 'organisation', qui ne valide pas
  // l'existence de l'entité) et remontait ensuite en 500 brut sur la violation
  // de contrainte FK missions.entite_id — corrigé ici par une vérification
  // explicite d'existence. Le même gap existe probablement dans Courrier/
  // Projets (déjà livrés, non modifiés ici, cf. MIGRATION.md Phase 6).
  async create(data: CreerMissionData, user: AuthenticatedUser): Promise<Mission> {
    const entiteExiste = await this.dataSource.query('select 1 from entites where id = $1 and organisation_id = $2', [
      data.entiteId,
      user.organisationId,
    ]);
    if (entiteExiste.length === 0) {
      throw new NotFoundException(`Entité ${data.entiteId} introuvable`);
    }
    if (!(await this.authorizationService.hasPermission(user.id, 'missions', 'creer', data.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à créer une mission pour cette entité");
    }
    return this.dataSource.transaction(async (manager) => {
      const reference = await this.parametrageService.genererNumero(
        manager,
        user.organisationId,
        'missions',
        null,
        null,
      );
      const workflowInstanceId = await this.workflowEngineService.demarrerWorkflow(
        'missions',
        user.organisationId,
        user.id,
        null,
        manager,
      );
      const instance = await manager.findOneByOrFail(WorkflowInstance, { id: workflowInstanceId });
      const etape = await manager.findOneByOrFail(WorkflowEtape, { id: instance.etapeCouranteId });

      const mission = await manager.save(
        Mission,
        manager.create(Mission, {
          organisationId: user.organisationId,
          entiteId: data.entiteId,
          reference,
          objet: data.objet,
          responsableId: data.responsableId ?? null,
          lieu: data.lieu ?? null,
          dateDepart: data.dateDepart,
          dateRetour: data.dateRetour,
          objectifs: data.objectifs ?? null,
          activitesPrevues: data.activitesPrevues ?? null,
          budgetPrevu: data.budgetPrevu ?? null,
          workflowInstanceId: instance.id,
          etapeCode: etape.code,
          etapeLibelle: etape.libelle,
          createdBy: user.id,
        }),
      );
      return mission;
    });
  }

  async update(id: string, patch: UpdateMissionData, user: AuthenticatedUser): Promise<Mission> {
    const mission = await this.findOne(id, user);
    await this.assertModifiable(mission, user);
    await this.missions.update(id, {
      ...patch,
      budgetPrevu:
        patch.budgetPrevu !== undefined ? (patch.budgetPrevu != null ? String(patch.budgetPrevu) : null) : undefined,
    } as Parameters<typeof this.missions.update>[1]);
    return this.findOne(id, user);
  }

  // Policy d'origine (missions_delete, 0016) : permission missions/supprimer
  // uniquement, indépendamment de responsable/participant.
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const mission = await this.findOne(id, user);
    if (!(await this.authorizationService.hasPermission(user.id, 'missions', 'supprimer', mission.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cette mission");
    }
    await this.missions.delete(id);
  }
}
