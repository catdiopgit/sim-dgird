import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { Entite } from '../administration/entites/entities/entite.entity';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowEtape } from '../workflow/entities/workflow-etape.entity';
import { WorkflowInstance } from '../workflow/entities/workflow-instance.entity';
import type { TypeActionCourrier } from '../workflow/entities/workflow-transition.entity';
import { Courrier } from './entities/courrier.entity';
import { CourrierDestinataire } from './entities/courrier-destinataire.entity';
import { courrierVersContexte } from './courrier-contexte.util';
import { CourriersService } from './courriers.service';

export interface TransitionDisponible {
  transitionId: string;
  code: string;
  libelleAction: string;
  etapeCibleId: string;
  etapeCibleLibelle: string;
  typeAction: TypeActionCourrier | null;
}

export interface ImputerCourrierData {
  entiteId: string;
  agentId?: string | null;
  instruction?: string | null;
  echeance?: string | null;
  transitionId?: string | null;
  commentaire?: string | null;
  typeAction?: TypeActionCourrier | null;
  entitesCopieIds?: string[] | null;
  actionsDemandeesIds?: string[] | null;
  prioriteValeurId?: string | null;
}

const LIBELLES_ACTION: Record<string, string> = {
  affectation: 'affecté',
  imputation: 'imputé',
  transmission: 'transmis',
  redirection: 'redirigé',
};

// Portage de app.fn_executer_transition_courrier (0046), app.fn_imputer_courrier
// (0054, avec correction du bug de régression sur la permission 'transmettre' —
// voir MIGRATION.md), app.fn_transitions_disponibles_courrier (0042),
// app.fn_entites_imputables (0034), app.fn_entites_transmissibles (0042),
// app.fn_personnes_transmissibles (0044).
@Injectable()
export class CourrierWorkflowService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly courriersService: CourriersService,
  ) {}

  async transitionsDisponibles(courrierId: string, user: AuthenticatedUser): Promise<TransitionDisponible[]> {
    const courrier = await this.courriersService.findOne(courrierId, user);
    if (!courrier.workflowInstanceId) return [];

    const instance = await this.dataSource.manager.findOneBy(WorkflowInstance, { id: courrier.workflowInstanceId });
    if (!instance || instance.statutInstance !== 'en_cours') return [];

    const transitions = await this.workflowEngineService.transitionsDisponibles(
      instance.workflowDefinitionId,
      instance.etapeCouranteId,
      user.id,
      courrier.entiteId,
      courrierVersContexte(courrier),
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

  async executerTransition(
    courrierId: string,
    transitionId: string,
    commentaire: string | null,
    user: AuthenticatedUser,
  ): Promise<void> {
    const courrier = await this.courriersService.findOne(courrierId, user);
    if (courrier.verrouilleLe) {
      throw new ConflictException('Courrier verrouillé (décharge ajoutée) — aucune action de workflow possible');
    }
    const autorise =
      courrier.createdBy === user.id ||
      (await this.authorizationService.hasPermission(user.id, 'courrier', 'modifier', courrier.entiteId));
    if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à agir sur ce courrier");
    if (!courrier.workflowInstanceId) throw new BadRequestException("Ce courrier n'a pas de workflow associé");

    await this.workflowEngineService.executerTransition(
      courrier.workflowInstanceId,
      transitionId,
      user.id,
      commentaire,
      courrier.entiteId,
      courrierVersContexte(courrier),
    );
  }

  // Portage de app.fn_imputer_courrier, corps 0054 — avec correction assumée
  // (décision utilisateur, 2026-08-28) de la régression sur la permission
  // 'transmettre'/'affecter' et restauration de la corrélation
  // workflow_historique_id sur les destinataires en copie (perdue en 0054,
  // introduite en 0043 ; listHistoriqueActions côté frontend en dépend).
  async imputerCourrier(courrierId: string, data: ImputerCourrierData, user: AuthenticatedUser): Promise<Courrier> {
    return this.dataSource.transaction(async (manager) => {
      const courrier = await manager.findOneBy(Courrier, { id: courrierId });
      if (!courrier || courrier.organisationId !== user.organisationId) {
        throw new NotFoundException('Courrier introuvable');
      }
      if (courrier.verrouilleLe) {
        throw new ConflictException('Courrier verrouillé (décharge ajoutée) — imputation impossible');
      }

      const autoriseEcriture =
        courrier.createdBy === user.id ||
        (await this.authorizationService.hasPermission(user.id, 'courrier', 'modifier', courrier.entiteId));
      if (!autoriseEcriture) throw new ForbiddenException("Vous n'êtes pas autorisé à imputer ce courrier");

      if (data.typeAction && courrier.sens !== 'entrant') {
        throw new BadRequestException(`Action ${data.typeAction} réservée aux courriers entrants`);
      }

      const actionPermission = data.typeAction === 'transmission' || data.typeAction === 'redirection' ? 'transmettre' : 'affecter';
      const autoriseAction = await this.authorizationService.hasPermission(user.id, 'courrier', actionPermission, data.entiteId);
      if (!autoriseAction) {
        throw new ForbiddenException(`Vous n'êtes pas autorisé à ${actionPermission === 'transmettre' ? 'transmettre vers' : 'affecter à'} cette entité`);
      }

      if (data.typeAction !== 'transmission') {
        await manager.update(Courrier, courrierId, { entiteId: data.entiteId, agentDestinataireId: data.agentId ?? null });
      }
      if (data.prioriteValeurId) {
        await manager.update(Courrier, courrierId, { prioriteValeurId: data.prioriteValeurId });
      }

      const principal = await manager.save(
        CourrierDestinataire,
        manager.create(CourrierDestinataire, {
          courrierId,
          entiteId: data.entiteId,
          utilisateurId: data.agentId ?? null,
          typeDiffusion: 'principal',
          instruction: data.instruction ?? null,
          echeance: data.echeance ?? null,
          typeAction: data.typeAction ?? null,
        }),
      );
      const destinatairesACorreler: CourrierDestinataire[] = [principal];

      for (const copieId of data.entitesCopieIds ?? []) {
        const autoriseCopie = await this.authorizationService.hasPermission(user.id, 'courrier', 'affecter', copieId);
        if (!autoriseCopie) throw new ForbiddenException("Vous n'êtes pas autorisé à mettre cette entité en copie");
        const copie = await manager.save(
          CourrierDestinataire,
          manager.create(CourrierDestinataire, { courrierId, entiteId: copieId, typeDiffusion: 'copie' }),
        );
        destinatairesACorreler.push(copie);
      }

      for (const valeurListeId of data.actionsDemandeesIds ?? []) {
        await manager.query(
          `insert into courrier_destinataire_actions (courrier_destinataire_id, valeur_liste_id)
           values ($1, $2) on conflict do nothing`,
          [principal.id, valeurListeId],
        );
      }

      const entiteRows: Array<{ personne_receptrice_id: string | null }> = await manager.query(
        'select personne_receptrice_id from entites where id = $1',
        [data.entiteId],
      );
      if (entiteRows[0]?.personne_receptrice_id) {
        const receptrice = await manager.save(
          CourrierDestinataire,
          manager.create(CourrierDestinataire, {
            courrierId,
            utilisateurId: entiteRows[0].personne_receptrice_id,
            typeDiffusion: 'copie',
          }),
        );
        destinatairesACorreler.push(receptrice);
      }

      if (data.transitionId) {
        if (!courrier.workflowInstanceId) throw new BadRequestException("Ce courrier n'a pas de workflow associé");
        const historiqueId = await this.workflowEngineService.executerTransition(
          courrier.workflowInstanceId,
          data.transitionId,
          user.id,
          data.commentaire ?? null,
          courrier.entiteId,
          courrierVersContexte(courrier),
          manager,
        );
        for (const destinataire of destinatairesACorreler) {
          await manager.update(CourrierDestinataire, destinataire.id, { workflowHistoriqueId: historiqueId });
        }
      }

      const courrierApres = await manager.findOneByOrFail(Courrier, { id: courrierId });
      const libelle = LIBELLES_ACTION[data.typeAction ?? 'imputation'] ?? 'imputé';
      await this.courriersService.notifierDestinatairesCourrier(
        manager,
        courrierId,
        `Courrier ${libelle} : ${courrierApres.numero || courrierApres.objet}`,
        data.instruction ?? null,
        user.id,
      );

      return courrierApres;
    });
  }

  // --- Périmètres dynamiques (portage 0034/0042/0044) ---

  async entitesImputables(user: AuthenticatedUser): Promise<Entite[]> {
    return this.entitesAvecPermission(user, 'affecter');
  }

  async entitesTransmissibles(user: AuthenticatedUser): Promise<Entite[]> {
    return this.entitesAvecPermission(user, 'transmettre');
  }

  private async entitesAvecPermission(user: AuthenticatedUser, action: string): Promise<Entite[]> {
    const entites = await this.dataSource.manager.find(Entite, {
      where: { organisationId: user.organisationId, actif: true },
      order: { ordre: 'ASC' },
    });
    const resultats: Entite[] = [];
    for (const entite of entites) {
      if (await this.authorizationService.hasPermission(user.id, 'courrier', action, entite.id)) resultats.push(entite);
    }
    return resultats;
  }

  async personnesTransmissibles(user: AuthenticatedUser): Promise<Array<{ utilisateurId: string; entiteId: string }>> {
    const vus = new Set<string>();
    const resultats: Array<{ utilisateurId: string; entiteId: string }> = [];
    const ajouter = (utilisateurId: string, entiteId: string) => {
      const cle = `${utilisateurId}:${entiteId}`;
      if (vus.has(cle)) return;
      vus.add(cle);
      resultats.push({ utilisateurId, entiteId });
    };

    const entites = await this.dataSource.manager.find(Entite, {
      where: { organisationId: user.organisationId, actif: true },
    });
    for (const entite of entites) {
      if (!entite.responsableUtilisateurId) continue;
      if (await this.authorizationService.hasPermission(user.id, 'courrier', 'transmettre', entite.id)) {
        ajouter(entite.responsableUtilisateurId, entite.id);
      }
    }

    // Le supérieur hiérarchique direct de l'utilisateur courant est toujours
    // transmissible, sans vérification de permission — fidèle à
    // fn_personnes_transmissibles (0044), deuxième branche de l'UNION.
    if (user.entiteId) {
      const moi = await this.dataSource.manager.findOneBy(Entite, { id: user.entiteId });
      if (moi?.parentEntiteId) {
        const parent = await this.dataSource.manager.findOneBy(Entite, { id: moi.parentEntiteId });
        if (parent?.responsableUtilisateurId) ajouter(parent.responsableUtilisateurId, parent.id);
      }
    }

    return resultats;
  }
}
