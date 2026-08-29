import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowInstance } from '../workflow/entities/workflow-instance.entity';
import { WorkflowEtape } from '../workflow/entities/workflow-etape.entity';
import type { TransitionDisponible } from '../courrier/courrier-workflow.service';
import { MissionsService } from './missions.service';
import { missionVersContexte } from './mission-contexte.util';

// Portage de app.fn_transitions_disponibles_mission / app.fn_executer_transition_mission
// (0077, dernier corps). Contrairement à GED (fn_executer_transition_versement,
// entièrement délégué), ce couple revérifie explicitement can_view_mission et la
// présence d'une instance de workflow avant de déléguer à WorkflowEngineService —
// même niveau de garde que Courrier, reproduit fidèlement.
@Injectable()
export class MissionsWorkflowService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly missionsService: MissionsService,
  ) {}

  async transitionsDisponibles(missionId: string, user: AuthenticatedUser): Promise<TransitionDisponible[]> {
    const mission = await this.missionsService.findOne(missionId, user);
    if (!mission.workflowInstanceId) return [];

    const instance = await this.dataSource.manager.findOneBy(WorkflowInstance, { id: mission.workflowInstanceId });
    if (!instance || instance.statutInstance !== 'en_cours') return [];

    const transitions = await this.workflowEngineService.transitionsDisponibles(
      instance.workflowDefinitionId,
      instance.etapeCouranteId,
      user.id,
      mission.entiteId,
      missionVersContexte(mission),
    );

    const resultats: TransitionDisponible[] = [];
    for (const transition of transitions) {
      const etapeCible = await this.dataSource.manager.findOneByOrFail(WorkflowEtape, { id: transition.etapeCibleId });
      resultats.push({
        transitionId: transition.id,
        code: transition.code,
        libelleAction: transition.libelleAction,
        etapeCibleId: etapeCible.id,
        etapeCibleLibelle: etapeCible.libelle,
        typeAction: null,
      });
    }
    return resultats;
  }

  async executerTransition(
    missionId: string,
    transitionId: string,
    commentaire: string | null,
    user: AuthenticatedUser,
  ): Promise<void> {
    const mission = await this.missionsService.findOne(missionId, user);
    if (!mission.workflowInstanceId) {
      throw new BadRequestException(`Mission ${missionId} sans instance de workflow`);
    }
    await this.workflowEngineService.executerTransition(
      mission.workflowInstanceId,
      transitionId,
      user.id,
      commentaire,
      mission.entiteId,
      missionVersContexte(mission),
    );
  }

  async getWorkflowInstance(missionId: string, user: AuthenticatedUser) {
    const mission = await this.missionsService.findOne(missionId, user);
    if (!mission.workflowInstanceId) return null;
    const instance = await this.workflowEngineService.getInstance(mission.workflowInstanceId);
    if (!instance) throw new NotFoundException('Instance de workflow introuvable');
    return instance;
  }

  async getWorkflowHistorique(missionId: string, user: AuthenticatedUser) {
    const mission = await this.missionsService.findOne(missionId, user);
    if (!mission.workflowInstanceId) return [];
    return this.workflowEngineService.listHistorique(mission.workflowInstanceId);
  }
}
