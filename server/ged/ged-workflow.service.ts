import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowInstance } from '../workflow/entities/workflow-instance.entity';
import { WorkflowEtape } from '../workflow/entities/workflow-etape.entity';
import type { TransitionDisponible } from '../courrier/courrier-workflow.service';
import { versementVersContexte } from './ged-versement-contexte.util';
import { GedVersementsService } from './ged-versements.service';

// Portage de app.fn_transitions_disponibles_versement et
// app.fn_executer_transition_versement (0058).
@Injectable()
export class GedWorkflowService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly versementsService: GedVersementsService,
  ) {}

  async transitionsDisponibles(versementId: string, user: AuthenticatedUser): Promise<TransitionDisponible[]> {
    const versement = await this.versementsService.findOne(versementId, user);
    // 'consulter' ici, pas 'modifier' — fidèle à fn_transitions_disponibles_versement :
    // lister les actions possibles n'est pas l'autorisation de les exécuter, ce
    // que WorkflowEngineService.transitionsDisponibles vérifie déjà par transition.
    const autorise =
      versement.redacteurId === user.id ||
      (await this.authorizationService.hasPermission(user.id, 'ged', 'consulter', versement.entiteId));
    if (!autorise) throw new NotFoundException('Versement introuvable');

    if (!versement.workflowInstanceId) return [];
    const instance = await this.dataSource.manager.findOneBy(WorkflowInstance, { id: versement.workflowInstanceId });
    if (!instance || instance.statutInstance !== 'en_cours') return [];

    const transitions = await this.workflowEngineService.transitionsDisponibles(
      instance.workflowDefinitionId,
      instance.etapeCouranteId,
      user.id,
      versement.entiteId,
      versementVersContexte(versement),
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
        typeAction: transition.typeAction,
      });
    }
    return resultats;
  }

  // Aucune vérification de permission/verrou supplémentaire ici, volontairement
  // fidèle à fn_executer_transition_versement (0058) qui délègue entièrement à
  // fn_executer_transition — contrairement à l'équivalent Courrier, plus gardé.
  // Différence de conception assumée côté source, pas reproduite comme un bug.
  async executerTransition(versementId: string, transitionId: string, commentaire: string | null, user: AuthenticatedUser): Promise<void> {
    const versement = await this.versementsService.findOne(versementId, user);
    if (!versement.workflowInstanceId) throw new BadRequestException("Ce versement n'a pas de workflow associé");

    await this.workflowEngineService.executerTransition(
      versement.workflowInstanceId,
      transitionId,
      user.id,
      commentaire,
      versement.entiteId,
      versementVersContexte(versement),
    );
  }

  async getWorkflowInstance(versementId: string, user: AuthenticatedUser) {
    const versement = await this.versementsService.findOne(versementId, user);
    if (!versement.workflowInstanceId) return null;
    return this.workflowEngineService.getInstance(versement.workflowInstanceId);
  }

  async getWorkflowHistorique(versementId: string, user: AuthenticatedUser) {
    const versement = await this.versementsService.findOne(versementId, user);
    if (!versement.workflowInstanceId) return [];
    return this.workflowEngineService.listHistorique(versement.workflowInstanceId);
  }
}
