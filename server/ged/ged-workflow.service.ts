import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowInstance } from '../workflow/entities/workflow-instance.entity';
import { WorkflowEtape } from '../workflow/entities/workflow-etape.entity';
import type { TransitionDisponible } from '../courrier/courrier-workflow.service';
import { versementVersContexte } from './ged-versement-contexte.util';
import { GedVersementsService } from './ged-versements.service';
import { GedNotificationsService } from './ged-notifications.service';
import { WorkflowTransition } from '../workflow/entities/workflow-transition.entity';

// Portage de app.fn_transitions_disponibles_versement et
// app.fn_executer_transition_versement (0058).
@Injectable()
export class GedWorkflowService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly versementsService: GedVersementsService,
    private readonly gedNotifications: GedNotificationsService,
  ) {}

  async transitionsDisponibles(versementId: string, user: AuthenticatedUser): Promise<TransitionDisponible[]> {
    const versement = await this.versementsService.findOne(versementId, user);
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

  // Les acteurs autorisés sont vérifiés par le moteur (transitions réservées au
  // rôle Archiviste dans le circuit « ged-standard »). v8.6 : l'archivage exige
  // que tous les documents soient classés dans un dossier actif du plan.
  async executerTransition(versementId: string, transitionId: string, commentaire: string | null, user: AuthenticatedUser): Promise<void> {
    const versement = await this.versementsService.findOne(versementId, user);
    if (!versement.workflowInstanceId) throw new BadRequestException("Ce versement n'a pas de workflow associé");

    const transition = await this.dataSource.manager.findOneBy(WorkflowTransition, { id: transitionId });
    const cible = transition
      ? await this.dataSource.manager.findOneBy(WorkflowEtape, { id: transition.etapeCibleId })
      : null;

    if (cible?.code === 'archivage') {
      const nonClasses: Array<{ titre: string }> = await this.dataSource.query(
        `select d.titre from documents d
         left join ged_dossiers g on g.id = d.dossier_id
         where d.versement_id = $1 and d.supprime_le is null
           and (d.dossier_id is null or g.supprime_le is not null or g.actif = false)`,
        [versementId],
      );
      if (nonClasses.length > 0) {
        throw new BadRequestException(
          `Classez tous les documents avant d'archiver (${nonClasses.length} non classé${nonClasses.length > 1 ? 's' : ''} : ${nonClasses
            .slice(0, 3)
            .map((d) => `« ${d.titre} »`)
            .join(', ')})`,
        );
      }
    }
    if (cible?.code === 'a_corriger' && !commentaire?.trim()) {
      throw new BadRequestException('Indiquez en commentaire ce que le déposant doit corriger');
    }

    await this.workflowEngineService.executerTransition(
      versement.workflowInstanceId,
      transitionId,
      user.id,
      commentaire,
      versement.entiteId,
      versementVersContexte(versement),
    );

    if (cible?.code === 'archivage') {
      await this.dataSource.query(
        'update documents set date_archivage = now() where versement_id = $1 and supprime_le is null and date_archivage is null',
        [versementId],
      );
      await this.gedNotifications.notifier([versement.redacteurId], {
        titre: 'Versement archivé',
        message: `« ${versement.objet} » a été classé et archivé.`,
        versementId,
        auteurId: user.id,
      });
    } else if (cible?.code === 'a_corriger') {
      await this.gedNotifications.notifier([versement.redacteurId], {
        titre: 'Versement à corriger',
        message: `« ${versement.objet} » vous est renvoyé : ${commentaire}`,
        versementId,
        auteurId: user.id,
      });
    }
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
