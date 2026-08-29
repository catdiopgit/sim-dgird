import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { OrganisationsService } from '../administration/organisations/organisations.service';
import { ParametrageService } from '../administration/parametrage/parametrage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowEtape } from '../workflow/entities/workflow-etape.entity';
import { WorkflowHistorique } from '../workflow/entities/workflow-historique.entity';
import { WorkflowInstance } from '../workflow/entities/workflow-instance.entity';
import { WorkflowTransition } from '../workflow/entities/workflow-transition.entity';
import { Courrier, type SensCourrier } from './entities/courrier.entity';
import { CourrierDestinataire } from './entities/courrier-destinataire.entity';
import { courrierVersContexte } from './courrier-contexte.util';

export type Bannette = 'a_traiter' | 'en_retard' | 'archives' | 'sortants' | 'en_copie' | 'clotures';

export interface CreerCourrierData {
  sens: SensCourrier;
  objet: string;
  entiteId?: string | null;
  typeValeurId?: string | null;
  prioriteValeurId?: string | null;
  confidentialiteValeurId?: string | null;
  modeTransmissionValeurId?: string | null;
  dateCourrier?: string | null;
  dateReception?: string | null;
  dateEnvoi?: string | null;
  expediteurNom?: string | null;
  expediteurTypeValeurId?: string | null;
  destinataireTexte?: string | null;
  entiteDestinataireId?: string | null;
  agentDestinataireId?: string | null;
  contactDestinataireId?: string | null;
  statutReceptionValeurId?: string | null;
  expediteurContactId?: string | null;
  referenceExpediteur?: string | null;
  observations?: string | null;
}

// Champs éditables directement (RLS courriers_update, 0037) — sens/numero/
// workflow_instance_id/etape_* etc. sont exclus, gérés exclusivement par
// create()/CourrierWorkflowService.
export interface UpdateCourrierData {
  objet?: string;
  typeValeurId?: string | null;
  prioriteValeurId?: string | null;
  confidentialiteValeurId?: string | null;
  modeTransmissionValeurId?: string | null;
  dateCourrier?: string;
  dateReception?: string | null;
  dateEnvoi?: string | null;
  expediteurNom?: string | null;
  expediteurTypeValeurId?: string | null;
  destinataireTexte?: string | null;
  entiteDestinataireId?: string | null;
  agentDestinataireId?: string | null;
  observations?: string | null;
}

export interface AuditCourrierEntree {
  action: string | null;
  champ: string;
  ancienne_valeur: unknown;
  nouvelle_valeur: unknown;
  utilisateur_id: string | null;
  created_at: Date;
}

// Portage de app.can_view_courrier, app.fn_creer_courrier, app.fn_bannettes_courrier,
// app.fn_journal_audit_courrier et app.fn_notifier_destinataires_courrier
// (voir MIGRATION.md, journal Phase 3). CourrierWorkflowService (imputation/
// transitions) et ContactsService/DestinatairesService dépendent de ce service
// pour canView/assertWritable/notifierDestinatairesCourrier.
@Injectable()
export class CourriersService {
  constructor(
    @InjectRepository(Courrier) private readonly courriers: Repository<Courrier>,
    @InjectRepository(CourrierDestinataire) private readonly destinataires: Repository<CourrierDestinataire>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly parametrageService: ParametrageService,
    private readonly organisationsService: OrganisationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // --- Visibilité / écriture (portage de app.can_view_courrier, 0015) ---

  async canView(courrier: Courrier, user: AuthenticatedUser): Promise<boolean> {
    if (courrier.organisationId !== user.organisationId) return false;
    if (courrier.createdBy === user.id) return true;
    if (user.entiteId && (courrier.entiteId === user.entiteId || courrier.entiteDestinataireId === user.entiteId)) {
      return true;
    }
    if (courrier.agentDestinataireId === user.id) return true;
    if (await this.authorizationService.hasPermission(user.id, 'courrier', 'consulter', courrier.entiteId)) return true;

    const conditions: FindOptionsWhere<CourrierDestinataire>[] = [{ courrierId: courrier.id, utilisateurId: user.id }];
    if (user.entiteId) conditions.push({ courrierId: courrier.id, entiteId: user.entiteId });
    const destinataire = await this.destinataires.findOne({ where: conditions });
    return !!destinataire;
  }

  // Reflète courriers_update (0037) : verrouille_le n'a plus aucune exception,
  // même pour un utilisateur avec la permission 'deverrouiller' — seul
  // fn_deverrouiller_courrier peut rouvrir l'écriture (stockage, différé).
  async assertWritable(courrier: Courrier, user: AuthenticatedUser): Promise<void> {
    if (courrier.verrouilleLe) {
      throw new ConflictException('Courrier verrouillé (décharge ajoutée) — aucune modification possible');
    }
    const autorise =
      courrier.createdBy === user.id ||
      (await this.authorizationService.hasPermission(user.id, 'courrier', 'modifier', courrier.entiteId));
    if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce courrier");
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Courrier> {
    const courrier = await this.courriers.findOneBy({ id });
    if (!courrier || !(await this.canView(courrier, user))) {
      throw new NotFoundException('Courrier introuvable');
    }
    return courrier;
  }

  async findAll(
    user: AuthenticatedUser,
    filtres: { sens?: SensCourrier; recherche?: string } = {},
  ): Promise<Courrier[]> {
    const qb = this.courriers
      .createQueryBuilder('c')
      .where('c.organisationId = :organisationId', { organisationId: user.organisationId })
      .andWhere('c.supprimeLe is null')
      .orderBy('c.createdAt', 'DESC');
    if (filtres.sens) qb.andWhere('c.sens = :sens', { sens: filtres.sens });
    if (filtres.recherche) {
      qb.andWhere('(c.objet ILIKE :recherche OR c.numero ILIKE :recherche)', { recherche: `%${filtres.recherche}%` });
    }
    // Filtrage de visibilité appliqué en mémoire (canView reproduit has_permission
    // + délégations, non trivial à inliner dans le SELECT) — volumes attendus
    // faibles (déploiement mono-VPS, ~20 utilisateurs par organisation).
    return this.filtrerVisibles(await qb.getMany(), user);
  }

  // --- Création (portage de app.fn_creer_courrier, dernier corps : 0054) ---

  async create(data: CreerCourrierData, user: AuthenticatedUser): Promise<Courrier> {
    return this.dataSource.transaction(async (manager) => {
      let entiteId = data.entiteId ?? null;
      if (!entiteId) {
        const valeur = await this.organisationsService.getParametre(
          user.organisationId,
          'courrier.entite_destinataire_initiale_id',
        );
        entiteId = typeof valeur === 'string' ? valeur : null;
      }

      const autorise = await this.authorizationService.hasPermission(user.id, 'courrier', 'creer', entiteId);
      if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à créer un courrier pour cette entité");

      let expediteurNom = data.expediteurNom ?? null;
      if (data.expediteurContactId) {
        const contactRows: Array<{ nom: string }> = await manager.query('select nom from contacts where id = $1', [
          data.expediteurContactId,
        ]);
        if (contactRows[0]) expediteurNom = contactRows[0].nom;
      }

      const numero = await this.parametrageService.genererNumero(manager, user.organisationId, 'courrier', entiteId, null);

      // Pas de p_valeur_liste_id transmis à demarrerWorkflow : le corps final de
      // fn_creer_courrier (depuis 0026) n'en passe plus non plus, malgré
      // l'association sens<->workflow câblée en 0021 — code mort assumé côté
      // SQL d'origine, non ressuscité ici. Voir MIGRATION.md.
      const workflowInstanceId = await this.workflowEngineService.demarrerWorkflow(
        'courrier',
        user.organisationId,
        user.id,
        null,
        manager,
      );
      const instance = await manager.findOneByOrFail(WorkflowInstance, { id: workflowInstanceId });
      let etape = await manager.findOneByOrFail(WorkflowEtape, { id: instance.etapeCouranteId });

      if (data.sens === 'entrant') {
        const cible = await this.deplacerVersEtapeInitialeEntrant(manager, instance, etape, user);
        if (cible) etape = cible;
      }

      const courrier = await manager.save(
        Courrier,
        manager.create(Courrier, {
          organisationId: user.organisationId,
          entiteId,
          sens: data.sens,
          numero,
          typeValeurId: data.typeValeurId ?? null,
          prioriteValeurId: data.prioriteValeurId ?? null,
          confidentialiteValeurId: data.confidentialiteValeurId ?? null,
          modeTransmissionValeurId: data.modeTransmissionValeurId ?? null,
          expediteurTypeValeurId: data.expediteurTypeValeurId ?? null,
          statutReceptionValeurId: data.statutReceptionValeurId ?? null,
          objet: data.objet,
          dateCourrier: data.dateCourrier ?? new Date().toISOString().slice(0, 10),
          dateReception: data.dateReception ? new Date(data.dateReception) : null,
          dateEnvoi: data.dateEnvoi ? new Date(data.dateEnvoi) : null,
          expediteurNom,
          expediteurContactId: data.expediteurContactId ?? null,
          destinataireTexte: data.destinataireTexte ?? null,
          entiteDestinataireId: data.entiteDestinataireId ?? null,
          agentDestinataireId: data.agentDestinataireId ?? null,
          contactDestinataireId: data.contactDestinataireId ?? null,
          referenceExpediteur: data.referenceExpediteur ?? null,
          redacteurId: user.id,
          workflowInstanceId: instance.id,
          etapeCode: etape.code,
          etapeLibelle: etape.libelle,
          observations: data.observations ?? null,
          createdBy: user.id,
        }),
      );

      await this.notifierDestinatairesCourrier(
        manager,
        courrier.id,
        `Courrier enregistré : ${courrier.numero || courrier.objet}`,
        courrier.objet,
        user.id,
      );

      return courrier;
    });
  }

  // Routage initial des courriers entrants (paramètre d'organisation
  // 'courrier.etape_apres_enregistrement_entrant_id') : déplace l'instance vers
  // l'étape configurée avant même la première lecture par un utilisateur, en
  // dehors du mécanisme normal executerTransition (aucune vérification
  // d'acteur/condition — c'est une bascule de configuration, pas une action).
  private async deplacerVersEtapeInitialeEntrant(
    manager: EntityManager,
    instance: WorkflowInstance,
    etapeInitiale: WorkflowEtape,
    user: AuthenticatedUser,
  ): Promise<WorkflowEtape | null> {
    const valeur = await this.organisationsService.getParametre(
      user.organisationId,
      'courrier.etape_apres_enregistrement_entrant_id',
    );
    const etapeCibleId = typeof valeur === 'string' ? valeur : null;
    if (!etapeCibleId) {
      throw new BadRequestException(
        "Étape initiale des courriers entrants non configurée (Administration > Paramètres > Courrier)",
      );
    }
    const etapeCible = await manager.findOneBy(WorkflowEtape, {
      id: etapeCibleId,
      workflowDefinitionId: instance.workflowDefinitionId,
    });
    if (!etapeCible) {
      throw new BadRequestException("L'étape configurée pour les courriers entrants n'appartient pas au workflow courrier");
    }
    if (etapeCible.id === etapeInitiale.id) return null;

    const transition = await manager.findOneBy(WorkflowTransition, {
      workflowDefinitionId: instance.workflowDefinitionId,
      etapeSourceId: etapeInitiale.id,
      etapeCibleId: etapeCible.id,
    });
    await manager.save(
      WorkflowHistorique,
      manager.create(WorkflowHistorique, {
        workflowInstanceId: instance.id,
        transitionId: transition?.id ?? null,
        etapePrecedenteId: etapeInitiale.id,
        etapeSuivanteId: etapeCible.id,
        utilisateurId: user.id,
        commentaire: 'Étape initiale automatique (configuration Administration > Paramètres > Courrier)',
      }),
    );
    await manager.update(WorkflowInstance, instance.id, { etapeCouranteId: etapeCible.id, etapeCouranteDepuis: new Date() });
    return etapeCible;
  }

  // --- Mise à jour / suppression (RLS courriers_update 0037, plain UPDATE) ---

  async update(id: string, patch: UpdateCourrierData, user: AuthenticatedUser): Promise<Courrier> {
    const courrier = await this.findOne(id, user);
    await this.assertWritable(courrier, user);
    await this.courriers.update(id, patch as Parameters<typeof this.courriers.update>[1]);
    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const courrier = await this.findOne(id, user);
    await this.assertWritable(courrier, user);
    await this.courriers.update(id, { supprimeLe: new Date() });
  }

  // --- Bannettes (portage de app.fn_bannettes_courrier, dernier corps : 0049) ---

  async findBannette(bannette: Bannette, user: AuthenticatedUser): Promise<Courrier[]> {
    switch (bannette) {
      case 'sortants':
        return this.filtrerVisibles(
          await this.courriers.find({
            where: { organisationId: user.organisationId, sens: 'sortant', supprimeLe: IsNull() },
            order: { createdAt: 'DESC' },
          }),
          user,
        );
      case 'en_copie': {
        const conditions: FindOptionsWhere<CourrierDestinataire>[] = [{ typeDiffusion: 'copie', utilisateurId: user.id }];
        if (user.entiteId) conditions.push({ typeDiffusion: 'copie', entiteId: user.entiteId });
        const lignes = await this.destinataires.find({ where: conditions });
        const ids = [...new Set(lignes.map((l) => l.courrierId))];
        return this.chargerEtFiltrer(ids, user);
      }
      case 'archives':
        return this.bannetteParEtat(
          user,
          `(we.type_etape = 'finale' or wi.statut_instance = 'terminee')`,
        );
      case 'clotures':
        return this.bannetteParEtat(
          user,
          `c.sens = 'entrant' and (we.type_etape = 'finale' or wi.statut_instance = 'terminee')`,
        );
      case 'en_retard':
        return this.bannetteParEtat(
          user,
          `wi.statut_instance = 'en_cours' and (
             (we.delai_jours is not null and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now())
             or exists (
               select 1 from courrier_destinataires cd
               where cd.courrier_id = c.id and cd.type_diffusion = 'principal'
                 and cd.echeance is not null and cd.echeance < current_date
             )
           )`,
        );
      case 'a_traiter':
        return this.bannetteATraiter(user);
    }
  }

  private async bannetteParEtat(user: AuthenticatedUser, condition: string): Promise<Courrier[]> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `select c.id from courriers c
       join workflow_instances wi on wi.id = c.workflow_instance_id
       join workflow_etapes we on we.id = wi.etape_courante_id
       where c.organisation_id = $1 and c.supprime_le is null and (${condition})
       order by c.created_at desc`,
      [user.organisationId],
    );
    return this.chargerEtFiltrer(rows.map((r) => r.id), user);
  }

  private async bannetteATraiter(user: AuthenticatedUser): Promise<Courrier[]> {
    const candidats: Array<{
      id: string;
      workflow_definition_id: string;
      etape_courante_id: string;
      entite_id: string | null;
    }> = await this.dataSource.query(
      `select c.id, wi.workflow_definition_id, wi.etape_courante_id, c.entite_id
       from courriers c
       join workflow_instances wi on wi.id = c.workflow_instance_id
       where c.organisation_id = $1 and c.supprime_le is null and wi.statut_instance = 'en_cours'`,
      [user.organisationId],
    );

    const idsRetenus: string[] = [];
    for (const candidat of candidats) {
      const courrier = await this.courriers.findOneBy({ id: candidat.id });
      if (!courrier) continue;
      const transitions = await this.workflowEngineService.transitionsDisponibles(
        candidat.workflow_definition_id,
        candidat.etape_courante_id,
        user.id,
        candidat.entite_id,
        courrierVersContexte(courrier),
      );
      if (transitions.length > 0) idsRetenus.push(candidat.id);
    }
    return this.chargerEtFiltrer(idsRetenus, user);
  }

  private async filtrerVisibles(courriers: Courrier[], user: AuthenticatedUser): Promise<Courrier[]> {
    const resultats: Courrier[] = [];
    for (const courrier of courriers) {
      if (await this.canView(courrier, user)) resultats.push(courrier);
    }
    return resultats;
  }

  private async chargerEtFiltrer(ids: string[], user: AuthenticatedUser): Promise<Courrier[]> {
    if (ids.length === 0) return [];
    const courriers = await this.courriers.find({
      where: { id: In(ids), organisationId: user.organisationId, supprimeLe: IsNull() },
    });
    const parId = new Map(courriers.map((c) => [c.id, c]));
    const ordonnes = ids.map((id) => parId.get(id)).filter((c): c is Courrier => !!c);
    return this.filtrerVisibles(ordonnes, user);
  }

  // --- Notifications (portage de app.fn_notifier_destinataires_courrier, 0053) ---

  // includeEntiteEtCopies=false (mode "mise à jour seule") n'est utilisé côté SQL
  // que par le trigger app.fn_notifier_transition, qui reste en SQL (voir
  // WorkflowEngineService) — les trois appelants NestJS (create, imputer, décharge
  // à venir) veulent toujours le fan-out complet, donc le paramètre n'est pas
  // reproduit ici.
  async notifierDestinatairesCourrier(
    manager: EntityManager,
    courrierId: string,
    titre: string,
    message: string | null,
    excludeUserId: string | null,
  ): Promise<void> {
    const courrier = await manager.findOneBy(Courrier, { id: courrierId });
    if (!courrier) return;

    const moduleRows: Array<{ id: string }> = await manager.query("select id from modules where code = 'courrier'");
    const moduleId = moduleRows[0]?.id ?? null;

    const dejaNotifies = new Set<string>();
    const notifier = async (destinataireId: string | null) => {
      if (!destinataireId || destinataireId === excludeUserId || dejaNotifies.has(destinataireId)) return;
      dejaNotifies.add(destinataireId);
      await this.notificationsService.notifier(manager, {
        destinataireId,
        moduleId,
        titre,
        message,
        objetModule: 'courrier',
        objetId: courrierId,
      });
    };

    await notifier(courrier.createdBy);

    if (courrier.entiteId) await this.notifierResponsableEtReceptrice(manager, courrier.entiteId, notifier);

    const copies = await manager.find(CourrierDestinataire, { where: { courrierId, typeDiffusion: 'copie' } });
    for (const copie of copies) {
      if (copie.utilisateurId) {
        await notifier(copie.utilisateurId);
      } else if (copie.entiteId) {
        await this.notifierResponsableEtReceptrice(manager, copie.entiteId, notifier);
      }
    }
  }

  private async notifierResponsableEtReceptrice(
    manager: EntityManager,
    entiteId: string,
    notifier: (id: string | null) => Promise<void>,
  ): Promise<void> {
    const rows: Array<{ responsable_utilisateur_id: string | null; personne_receptrice_id: string | null }> =
      await manager.query('select responsable_utilisateur_id, personne_receptrice_id from entites where id = $1', [
        entiteId,
      ]);
    const entite = rows[0];
    if (!entite) return;
    await notifier(entite.responsable_utilisateur_id);
    await notifier(entite.personne_receptrice_id);
  }

  // --- Workflow générique, exposé maintenant que courriers existe et peut servir
  // de base au scoping par visibilité (Phase 2 avait délibérément différé ces
  // deux lectures faute d'un tel objet porteur — voir MIGRATION.md) ---

  async getWorkflowInstance(courrierId: string, user: AuthenticatedUser) {
    const courrier = await this.findOne(courrierId, user);
    if (!courrier.workflowInstanceId) return null;
    return this.workflowEngineService.getInstance(courrier.workflowInstanceId);
  }

  async getWorkflowHistorique(courrierId: string, user: AuthenticatedUser) {
    const courrier = await this.findOne(courrierId, user);
    if (!courrier.workflowInstanceId) return [];
    return this.workflowEngineService.listHistorique(courrier.workflowInstanceId);
  }

  // --- Audit (portage de app.fn_journal_audit_courrier, 0035) ---

  async journalAuditCourrier(courrierId: string, user: AuthenticatedUser): Promise<AuditCourrierEntree[]> {
    const autoriseAdmin = await this.authorizationService.hasPermission(user.id, 'administration', 'consulter');
    if (!autoriseAdmin) {
      await this.findOne(courrierId, user); // lève NotFoundException si non visible
    }

    const rows: Array<{
      action: string | null;
      ancienne_valeur: Record<string, unknown> | null;
      nouvelle_valeur: Record<string, unknown> | null;
      utilisateur_id: string | null;
      created_at: Date;
    }> = await this.dataSource.query(
      `select a.code as action, ja.ancienne_valeur, ja.nouvelle_valeur, ja.utilisateur_id, ja.created_at
       from journal_audit ja
       left join actions a on a.id = ja.action_id
       where ja.objet_type = 'courriers' and ja.objet_id = $1
       order by ja.created_at desc`,
      [courrierId],
    );

    const resultats: AuditCourrierEntree[] = [];
    for (const row of rows) {
      const ancien = row.ancienne_valeur ?? {};
      const nouveau = row.nouvelle_valeur ?? {};
      const champs = new Set([...Object.keys(ancien), ...Object.keys(nouveau)]);
      champs.delete('updated_at');
      for (const champ of champs) {
        const avant = ancien[champ] ?? null;
        const apres = nouveau[champ] ?? null;
        if (JSON.stringify(avant) === JSON.stringify(apres)) continue;
        resultats.push({
          action: row.action,
          champ,
          ancienne_valeur: avant,
          nouvelle_valeur: apres,
          utilisateur_id: row.utilisateur_id,
          created_at: row.created_at,
        });
      }
    }
    return resultats;
  }
}
