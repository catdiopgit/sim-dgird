import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { WorkflowEtape } from './entities/workflow-etape.entity';
import { WorkflowHistorique } from './entities/workflow-historique.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowTransition } from './entities/workflow-transition.entity';
import { WorkflowTransitionActeur, type TypeActeurWorkflow } from './entities/workflow-transition-acteur.entity';
import { conditionSatisfaite } from './condition.util';

interface WorkflowInstanceRow {
  id: string;
  workflow_definition_id: string;
  etape_courante_id: string;
  statut_instance: string;
}

// Portage de app.fn_demarrer_workflow / app.fn_executer_transition / app.fn_candidat_satisfait_acteur
// / app.acteur_de_transition_autorise (0005/0020_workflow_v2.sql) — moteur générique réutilisable
// par tout module métier (Courrier, GED, Missions...) une fois leurs entités disponibles.
//
// app.fn_notifier_transition (trigger AFTER INSERT ON workflow_historique) et
// app.sync_etape_cache ne sont volontairement PAS portés ici : ce sont des triggers SQL qui
// continuent de s'exécuter pour tout INSERT réel dans ces tables, y compris ceux émis par ce
// service — les reporter en TypeScript dupliquerait leur effet. Voir MIGRATION.md, journal Phase 2.
@Injectable()
export class WorkflowEngineService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // `manager` optionnel : si fourni (ex. CourriersService.create, qui a déjà sa
  // propre transaction englobant numérotation + création du courrier), l'écriture
  // se fait dans cette transaction plutôt que d'en ouvrir une seconde sur une
  // connexion distincte — deux transactions séparées ne seraient pas atomiques
  // l'une avec l'autre (un rollback de l'appelant ne déferait pas ceci).
  async demarrerWorkflow(
    moduleCode: string,
    organisationId: string,
    utilisateurId: string,
    valeurListeId: string | null = null,
    manager?: EntityManager,
  ): Promise<string> {
    if (manager) {
      return this.demarrerWorkflowAvec(manager, moduleCode, organisationId, utilisateurId, valeurListeId);
    }
    return this.dataSource.transaction((m) =>
      this.demarrerWorkflowAvec(m, moduleCode, organisationId, utilisateurId, valeurListeId),
    );
  }

  private async demarrerWorkflowAvec(
    manager: EntityManager,
    moduleCode: string,
    organisationId: string,
    utilisateurId: string,
    valeurListeId: string | null,
  ): Promise<string> {
    const moduleRows: Array<{ id: string }> = await manager.query('select id from modules where code = $1', [
      moduleCode,
    ]);
    const moduleId = moduleRows[0]?.id;
    if (!moduleId) throw new NotFoundException(`Module '${moduleCode}' introuvable`);

    let definitionId: string | null = null;
    if (valeurListeId) {
      const rows: Array<{ id: string }> = await manager.query(
        `select wd.id
         from workflow_definition_associations wda
         join workflow_definitions wd on wd.id = wda.workflow_definition_id
         where wda.valeur_liste_id = $1 and wd.organisation_id = $2 and wd.module_id = $3 and wd.actif = true
         limit 1`,
        [valeurListeId, organisationId, moduleId],
      );
      definitionId = rows[0]?.id ?? null;
    }
    if (!definitionId) {
      const rows: Array<{ id: string }> = await manager.query(
        `select id from workflow_definitions
         where organisation_id = $1 and module_id = $2 and est_defaut = true and actif = true
         limit 1`,
        [organisationId, moduleId],
      );
      definitionId = rows[0]?.id ?? null;
    }
    if (!definitionId) throw new NotFoundException(`Aucun workflow par défaut défini pour le module '${moduleCode}'`);

    const etapeInitiale = await manager.findOneBy(WorkflowEtape, {
      workflowDefinitionId: definitionId,
      typeEtape: 'initiale',
    });
    if (!etapeInitiale) throw new NotFoundException("Étape initiale introuvable pour ce workflow");

    const instance = await manager.save(
      WorkflowInstance,
      manager.create(WorkflowInstance, {
        workflowDefinitionId: definitionId,
        etapeCouranteId: etapeInitiale.id,
        etapeCouranteDepuis: new Date(),
        createdBy: utilisateurId,
      }),
    );
    await manager.save(
      WorkflowHistorique,
      manager.create(WorkflowHistorique, {
        workflowInstanceId: instance.id,
        transitionId: null,
        etapePrecedenteId: null,
        etapeSuivanteId: etapeInitiale.id,
        utilisateurId,
        commentaire: 'Démarrage du workflow',
      }),
    );
    return instance.id;
  }

  // Retourne l'id de la ligne workflow_historique créée (nécessaire aux appelants
  // qui doivent la corréler ensuite, ex. CourrierWorkflowService.imputerCourrier
  // avec courrier_destinataires.workflow_historique_id). `manager` optionnel :
  // même raison que demarrerWorkflow ci-dessus — composer dans la transaction de
  // l'appelant plutôt que d'en ouvrir une seconde non atomique avec elle.
  async executerTransition(
    instanceId: string,
    transitionId: string,
    utilisateurId: string,
    commentaire: string | null = null,
    entiteObjet: string | null = null,
    contexte: Record<string, unknown> = {},
    manager?: EntityManager,
  ): Promise<string> {
    if (manager) {
      return this.executerTransitionAvec(manager, instanceId, transitionId, utilisateurId, commentaire, entiteObjet, contexte);
    }
    return this.dataSource.transaction((m) =>
      this.executerTransitionAvec(m, instanceId, transitionId, utilisateurId, commentaire, entiteObjet, contexte),
    );
  }

  private async executerTransitionAvec(
    manager: EntityManager,
    instanceId: string,
    transitionId: string,
    utilisateurId: string,
    commentaire: string | null,
    entiteObjet: string | null,
    contexte: Record<string, unknown>,
  ): Promise<string> {
    const instanceRows: WorkflowInstanceRow[] = await manager.query(
      'select * from workflow_instances where id = $1 for update',
      [instanceId],
    );
    const instance = instanceRows[0];
    if (!instance) throw new NotFoundException('Instance de workflow introuvable');
    if (instance.statut_instance !== 'en_cours') {
      throw new ConflictException('Ce workflow est déjà terminé ou annulé');
    }

    const transition = await manager.findOneBy(WorkflowTransition, { id: transitionId });
    if (!transition) throw new NotFoundException('Transition introuvable');
    if (transition.workflowDefinitionId !== instance.workflow_definition_id) {
      throw new BadRequestException("Cette transition n'appartient pas au workflow de cette instance");
    }
    if (transition.etapeSourceId && transition.etapeSourceId !== instance.etape_courante_id) {
      throw new BadRequestException("L'étape courante de l'instance ne correspond pas à cette transition");
    }

    const autorise = await this.acteurDeTransitionAutorise(manager, transitionId, utilisateurId, entiteObjet);
    if (!autorise) throw new ForbiddenException('Action non autorisée pour cet utilisateur');

    if (!conditionSatisfaite(transition.condition, contexte)) {
      throw new BadRequestException('Condition de transition non satisfaite');
    }

    const historique = await manager.save(
      WorkflowHistorique,
      manager.create(WorkflowHistorique, {
        workflowInstanceId: instanceId,
        transitionId,
        etapePrecedenteId: instance.etape_courante_id,
        etapeSuivanteId: transition.etapeCibleId,
        utilisateurId,
        commentaire,
      }),
    );

    const etapeCible = await manager.findOneByOrFail(WorkflowEtape, { id: transition.etapeCibleId });
    const terminee = etapeCible.typeEtape === 'finale' || etapeCible.typeEtape === 'rejet';

    await manager.update(WorkflowInstance, instanceId, {
      etapeCouranteId: transition.etapeCibleId,
      etapeCouranteDepuis: new Date(),
      statutInstance: terminee ? 'terminee' : 'en_cours',
      ...(terminee ? { termineLe: new Date() } : {}),
    });

    return historique.id;
  }

  // Portage de la logique de filtrage réutilisée par app.fn_transitions_disponibles_courrier
  // (0042) et la branche 'a_traiter' de app.fn_bannettes_courrier (0049) : transitions
  // partant de l'étape courante (ou déclenchables depuis n'importe quelle étape),
  // dont la condition est satisfaite et dont l'utilisateur est un acteur autorisé.
  async transitionsDisponibles(
    workflowDefinitionId: string,
    etapeCouranteId: string,
    utilisateurId: string,
    entiteObjet: string | null,
    contexte: Record<string, unknown>,
  ): Promise<WorkflowTransition[]> {
    const candidates = await this.dataSource.manager.find(WorkflowTransition, {
      where: [
        { workflowDefinitionId, etapeSourceId: etapeCouranteId },
        { workflowDefinitionId, etapeSourceId: IsNull() },
      ],
    });

    const resultats: WorkflowTransition[] = [];
    for (const transition of candidates) {
      if (!conditionSatisfaite(transition.condition, contexte)) continue;
      if (await this.acteurDeTransitionAutorise(this.dataSource.manager, transition.id, utilisateurId, entiteObjet)) {
        resultats.push(transition);
      }
    }
    return resultats;
  }

  // Résout l'ensemble des utilisateurs "acteurs" d'une étape (toutes les transitions
  // en sortant, sans filtre de condition ni de cible) — utilisé par la notification
  // de retard (Phase 7, app.fn_detecter_et_notifier_retards) pour déterminer qui
  // relancer. Contrairement à acteurDeTransitionAutorise (qui teste UN candidat),
  // cette méthode énumère TOUS les utilisateurs satisfaisant chaque acteur, avec
  // exactement les mêmes conditions de correspondance par type.
  async resolveDestinatairesEtape(
    etapeSourceId: string,
    entiteObjet: string | null,
    manager?: EntityManager,
  ): Promise<string[]> {
    const m = manager ?? this.dataSource.manager;
    const acteurs: Array<{
      type_acteur: TypeActeurWorkflow;
      role_id: string | null;
      fonction_id: string | null;
      entite_id: string | null;
      utilisateur_id: string | null;
    }> = await m.query(
      `select distinct wtr.type_acteur, wtr.role_id, wtr.fonction_id, wtr.entite_id, wtr.utilisateur_id
       from workflow_transitions wt
       join workflow_transition_roles wtr on wtr.workflow_transition_id = wt.id
       where wt.etape_source_id = $1`,
      [etapeSourceId],
    );

    const destinataires = new Set<string>();
    for (const acteur of acteurs) {
      const rows: Array<{ id: string }> = await m.query(
        `select u.id from utilisateurs u
         where ($1::text = 'role' and exists (
                 select 1 from utilisateur_roles ur
                 where ur.utilisateur_id = u.id and ur.role_id = $2
                   and (ur.date_fin is null or ur.date_fin >= current_date)
               ))
            or ($1::text = 'fonction' and u.fonction_id = $3)
            or ($1::text = 'entite' and u.entite_id = $4)
            or ($1::text = 'entite_et_descendants' and exists (
                 select 1 from entites cible
                 join entites racine on racine.id = $4
                 where cible.id = u.entite_id and racine.chemin OPERATOR(extensions.@>) cible.chemin
               ))
            or ($1::text = 'utilisateur' and u.id = $5)
            or ($1::text = 'responsable_entite_courante' and $6::uuid is not null and exists (
                 select 1 from entites e where e.id = $6 and e.responsable_utilisateur_id = u.id
               ))
            or ($1::text = 'superieur_hierarchique_courant' and $6::uuid is not null and exists (
                 select 1 from entites e join entites parent on parent.id = e.parent_entite_id
                 where e.id = $6 and parent.responsable_utilisateur_id = u.id
               ))`,
        [acteur.type_acteur, acteur.role_id, acteur.fonction_id, acteur.entite_id, acteur.utilisateur_id, entiteObjet],
      );
      for (const row of rows) destinataires.add(row.id);
    }
    return [...destinataires];
  }

  getInstance(id: string): Promise<WorkflowInstance | null> {
    return this.dataSource.manager.findOneBy(WorkflowInstance, { id });
  }

  listHistorique(workflowInstanceId: string): Promise<WorkflowHistorique[]> {
    return this.dataSource.manager.find(WorkflowHistorique, {
      where: { workflowInstanceId },
      order: { dateAction: 'ASC' },
    });
  }

  private async acteurDeTransitionAutorise(
    manager: EntityManager,
    transitionId: string,
    utilisateurId: string,
    entiteObjet: string | null,
  ): Promise<boolean> {
    const acteurs = await manager.find(WorkflowTransitionActeur, { where: { workflowTransitionId: transitionId } });
    if (acteurs.length === 0) return true;

    for (const acteur of acteurs) {
      if (await this.candidatSatisfaitActeur(manager, acteur, utilisateurId, entiteObjet)) return true;
    }

    // Délégation (§9) : pas de filtre module/entité ici, contrairement à
    // AuthorizationService.hasPermission — fidèle à acteur_de_transition_autorise (0020).
    const delegations: Array<{ delegant_id: string }> = await manager.query(
      `select delegant_id from delegations
       where delegataire_id = $1 and actif
         and date_debut <= current_date and (date_fin is null or date_fin >= current_date)`,
      [utilisateurId],
    );
    for (const { delegant_id } of delegations) {
      for (const acteur of acteurs) {
        if (await this.candidatSatisfaitActeur(manager, acteur, delegant_id, entiteObjet)) return true;
      }
    }
    return false;
  }

  private async candidatSatisfaitActeur(
    manager: EntityManager,
    acteur: WorkflowTransitionActeur,
    candidatId: string,
    entiteObjet: string | null,
  ): Promise<boolean> {
    const exists = async (sql: string, params: unknown[]): Promise<boolean> => {
      const rows = await manager.query(sql, params);
      return rows.length > 0;
    };

    switch (acteur.typeActeur as TypeActeurWorkflow) {
      case 'role':
        return exists(
          `select 1 from utilisateur_roles
           where utilisateur_id = $1 and role_id = $2 and (date_fin is null or date_fin >= current_date) limit 1`,
          [candidatId, acteur.roleId],
        );
      case 'fonction':
        return exists('select 1 from utilisateurs where id = $1 and fonction_id = $2 limit 1', [
          candidatId,
          acteur.fonctionId,
        ]);
      case 'entite':
        return exists('select 1 from utilisateurs where id = $1 and entite_id = $2 limit 1', [
          candidatId,
          acteur.entiteId,
        ]);
      case 'entite_et_descendants':
        // Opérateur ltree qualifié explicitement (extensions.@>), voir AuthorizationService.
        return exists(
          `select 1 from utilisateurs u
           join entites cible on cible.id = u.entite_id
           join entites racine on racine.id = $2
           where u.id = $1 and racine.chemin OPERATOR(extensions.@>) cible.chemin
           limit 1`,
          [candidatId, acteur.entiteId],
        );
      case 'utilisateur':
        return candidatId === acteur.utilisateurId;
      case 'responsable_entite_courante':
        if (!entiteObjet) return false;
        return exists('select 1 from entites where id = $1 and responsable_utilisateur_id = $2 limit 1', [
          entiteObjet,
          candidatId,
        ]);
      case 'superieur_hierarchique_courant':
        if (!entiteObjet) return false;
        return exists(
          `select 1 from entites parent
           join entites courante on courante.parent_entite_id = parent.id
           where courante.id = $1 and parent.responsable_utilisateur_id = $2
           limit 1`,
          [entiteObjet, candidatId],
        );
      default:
        return false;
    }
  }
}
