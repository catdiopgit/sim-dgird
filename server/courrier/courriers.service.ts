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
import { courrierVersContexte, resoudreDestinataireCourantCourrier } from './courrier-contexte.util';

export type Bannette = 'a_traiter' | 'a_suivre' | 'en_retard' | 'archives' | 'sortants' | 'en_copie' | 'clotures';

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
  expediteurContactId?: string | null;
  referenceExpediteur?: string | null;
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


// --- Règles de dates (recette 2026-11) ---
// Un courrier peut être daté d'avant sa réception (cas normal), mais aucune
// des deux dates ne peut être future, et la réception ne peut précéder la
// date du courrier. Tolérance de 5 minutes sur la réception (horloges des
// postes de saisie).
const TOLERANCE_FUTUR_MS = 5 * 60_000;

function jourIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function validerDatesCourrier(dateCourrier: string | null | undefined, dateReception: Date | string | null | undefined): void {
  const maintenant = Date.now();
  const aujourdhui = jourIso(new Date(maintenant));
  if (dateCourrier) {
    const jour = String(dateCourrier).slice(0, 10);
    if (jour > aujourdhui) throw new BadRequestException('La date du courrier ne peut pas être dans le futur.');
  }
  if (dateReception) {
    const reception = new Date(dateReception);
    if (Number.isNaN(reception.getTime())) throw new BadRequestException('Date de réception invalide.');
    if (reception.getTime() > maintenant + TOLERANCE_FUTUR_MS) {
      throw new BadRequestException('La date de réception ne peut pas être dans le futur.');
    }
    if (dateCourrier && jourIso(reception) < String(dateCourrier).slice(0, 10)) {
      throw new BadRequestException('La date de réception ne peut pas être antérieure à la date du courrier.');
    }
  }
}

// Recherche insensible à la casse et aux accents (sans extension unaccent).
const ACCENTS = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ';
const SANS_ACCENTS = 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY';
const sqlSansAccent = (expr: string) => `lower(translate(coalesce(${expr}, ''), '${ACCENTS}', '${SANS_ACCENTS}'))`;
export function normaliserRecherche(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Positionne l'auteur des écritures pour le trigger d'audit (auth.uid(),
// migration 1794350000000) — local à la transaction en cours.
export async function definirAuteur(manager: EntityManager, userId: string): Promise<void> {
  await manager.query(`select set_config('app.user_id', $1, true)`, [userId]);
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

  // Recette 2026-11 : chacun ne voit que ce qui le concerne — plus de
  // visibilité automatique de tous les courriers de son entité.
  async canView(courrier: Courrier, user: AuthenticatedUser): Promise<boolean> {
    if (courrier.organisationId !== user.organisationId) return false;
    // 1. Enregistré par moi, ou affecté à moi
    if (courrier.createdBy === user.id || courrier.agentDestinataireId === user.id) return true;
    // 2. Consultation étendue par rôle (Bureau Courrier, DG, administration…) —
    //    la portée « personnel » ne donne PAS accès aux courriers des autres.
    if (await this.aConsultationEtendue(user.id, courrier.entiteId)) return true;
    // 3. Destinataire nominatif (principal ou copie)
    const nominatif = await this.destinataires.findOne({ where: { courrierId: courrier.id, utilisateurId: user.id } });
    if (nominatif) return true;
    // 4. Responsable ou personne réceptrice de l'entité du courrier, d'une entité
    //    parente, ou d'une entité mise en copie
    const encadrement: unknown[] = await this.dataSource.query(
      `select 1 from entites mien
       where (mien.responsable_utilisateur_id = $2 or mien.personne_receptrice_id = $2)
         and exists (
           select 1 from entites cible
           where mien.chemin OPERATOR(extensions.@>) cible.chemin
             and (cible.id = $3::uuid or cible.id in (
               select cd.entite_id from courrier_destinataires cd where cd.courrier_id = $1 and cd.entite_id is not null))
         )
       limit 1`,
      [courrier.id, user.id, courrier.entiteId],
    );
    if (encadrement.length > 0) return true;
    // 5. A déjà agi sur le circuit de ce courrier
    if (courrier.workflowInstanceId) {
      const participe: unknown[] = await this.dataSource.query(
        'select 1 from workflow_historique where workflow_instance_id = $1 and utilisateur_id = $2 limit 1',
        [courrier.workflowInstanceId, user.id],
      );
      if (participe.length > 0) return true;
      // 6. Peut agir sur l'étape en cours (ex. DG à l'étape « Transmission au DG »)
      const rows: Array<{ workflow_definition_id: string; etape_courante_id: string }> = await this.dataSource.query(
        `select workflow_definition_id, etape_courante_id from workflow_instances
         where id = $1 and statut_instance = 'en_cours'`,
        [courrier.workflowInstanceId],
      );
      if (rows[0]) {
        const transitions = await this.workflowEngineService.transitionsDisponibles(
          rows[0].workflow_definition_id,
          rows[0].etape_courante_id,
          user.id,
          courrier.entiteId,
          courrierVersContexte(courrier),
          await resoudreDestinataireCourantCourrier(courrier, this.dataSource),
        );
        if (transitions.length > 0) return true;
      }
    }
    return false;
  }

  private async aConsultationEtendue(utilisateurId: string, entiteId: string | null): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `select 1
       from utilisateur_roles ur
       join permissions p on p.role_id = ur.role_id
       join modules m on m.id = p.module_id and m.code = 'courrier'
       join actions a on a.id = p.action_id and a.code = 'consulter'
       left join entites ue on ue.id = ur.entite_id
       where ur.utilisateur_id = $1
         and (ur.date_fin is null or ur.date_fin >= current_date)
         and (
           p.portee = 'organisation'
           or ($2::uuid is not null and p.portee = 'entite' and ur.entite_id = $2::uuid)
           or ($2::uuid is not null and p.portee = 'entite_et_descendants' and ue.chemin is not null
               and exists (select 1 from entites cible where cible.id = $2::uuid
                           and ue.chemin OPERATOR(extensions.@>) cible.chemin))
         )
       limit 1`,
      [utilisateurId, entiteId],
    );
    return rows.length > 0;
  }

  // Reflète courriers_update (0037) : verrouille_le n'a plus aucune exception,
  // même pour un utilisateur avec la permission 'deverrouiller' — seul
  // fn_deverrouiller_courrier peut rouvrir l'écriture (stockage, différé).
  async assertWritable(courrier: Courrier, user: AuthenticatedUser): Promise<void> {
    if (courrier.annuleLe) {
      throw new ConflictException('Courrier annulé — aucune modification possible');
    }
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
    const recherche = filtres.recherche ? normaliserRecherche(filtres.recherche) : '';
    if (recherche) {
      const champs = ['c.objet', 'c.numero', 'c.expediteur_nom', 'c.reference_expediteur', 'c.destinataire_texte'];
      qb.andWhere(`(${champs.map((ch) => `${sqlSansAccent(ch)} LIKE :recherche`).join(' OR ')})`, {
        recherche: `%${recherche}%`,
      });
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

      if (data.sens === 'entrant') {
        if (!data.expediteurContactId && !data.expediteurNom?.trim()) {
          throw new BadRequestException("L'expéditeur est obligatoire pour un courrier arrivé.");
        }
        if (!data.dateReception) {
          throw new BadRequestException('La date de réception est obligatoire pour un courrier arrivé.');
        }
      }
      validerDatesCourrier(data.dateCourrier ?? jourIso(new Date()), data.dateReception);

      let expediteurNom = data.expediteurNom ?? null;
      if (data.expediteurContactId) {
        const contactRows: Array<{ nom: string }> = await manager.query('select nom from contacts where id = $1', [
          data.expediteurContactId,
        ]);
        if (contactRows[0]) expediteurNom = contactRows[0].nom;
      }

      // Recette 2026-11 : les départs ont leur numérotation (DEP-…) et leur circuit
      // (enregistrement → expédition → décharge), associés à la valeur 'sortant'
      // de la liste courrier_sens. Repli sur la règle / le circuit par défaut.
      let sensValeurId: string | null = null;
      if (data.sens === 'sortant') {
        const sensRows: Array<{ id: string }> = await manager.query(
          `select vl.id from valeurs_listes vl join listes_valeurs lv on lv.id = vl.liste_id
           where lv.organisation_id = $1 and lv.code = 'courrier_sens' and vl.code = 'sortant' limit 1`,
          [user.organisationId],
        );
        sensValeurId = sensRows[0]?.id ?? null;
      }
      const numero = await this.parametrageService.genererNumero(manager, user.organisationId, 'courrier', entiteId, sensValeurId);

      // Pas de p_valeur_liste_id transmis à demarrerWorkflow : le corps final de
      // fn_creer_courrier (depuis 0026) n'en passe plus non plus, malgré
      // l'association sens<->workflow câblée en 0021 — code mort assumé côté
      // SQL d'origine, non ressuscité ici. Voir MIGRATION.md.
      const workflowInstanceId = await this.workflowEngineService.demarrerWorkflow(
        'courrier',
        user.organisationId,
        user.id,
        sensValeurId,
        manager,
      );
      const instance = await manager.findOneByOrFail(WorkflowInstance, { id: workflowInstanceId });
      let etape = await manager.findOneByOrFail(WorkflowEtape, { id: instance.etapeCouranteId });

      if (data.sens === 'entrant') {
        const cible = await this.deplacerVersEtapeInitialeEntrant(manager, instance, etape, user);
        if (cible) etape = cible;
      }

      await definirAuteur(manager, user.id);
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
        // Passage automatique à l'étape initiale configurée : pas de commentaire
        // technique (il s'afficherait dans l'historique du circuit).
        commentaire: null,
      }),
    );
    await manager.update(WorkflowInstance, instance.id, { etapeCouranteId: etapeCible.id, etapeCouranteDepuis: new Date() });
    return etapeCible;
  }

  // --- Mise à jour / suppression (RLS courriers_update 0037, plain UPDATE) ---

  async update(id: string, patch: UpdateCourrierData, user: AuthenticatedUser): Promise<Courrier> {
    const courrier = await this.findOne(id, user);
    await this.assertWritable(courrier, user);

    if (patch.objet !== undefined && !patch.objet.trim()) throw new BadRequestException("L'objet est obligatoire.");
    const dateCourrier = patch.dateCourrier ?? courrier.dateCourrier;
    const dateReception = patch.dateReception !== undefined ? patch.dateReception : courrier.dateReception;
    if (courrier.sens === 'entrant' && patch.dateReception === null) {
      throw new BadRequestException('La date de réception est obligatoire pour un courrier arrivé.');
    }
    validerDatesCourrier(String(dateCourrier), dateReception);

    await this.dataSource.transaction(async (manager) => {
      const changements: Record<string, unknown> = { ...patch };
      if (patch.expediteurContactId) {
        const rows: Array<{ nom: string }> = await manager.query(
          'select nom from contacts where id = $1 and organisation_id = $2',
          [patch.expediteurContactId, user.organisationId],
        );
        if (!rows[0]) throw new BadRequestException('Expéditeur introuvable.');
        changements.expediteurNom = rows[0].nom;
      }
      if (patch.dateReception) changements.dateReception = new Date(patch.dateReception);
      await definirAuteur(manager, user.id);
      await manager.update(Courrier, id, changements as Parameters<typeof manager.update<Courrier>>[2]);
    });
    return this.findOne(id, user);
  }

  // Annulation (recette 2026-11) : le courrier reste au registre, son
  // workflow est clos (statut 'annulee' → sort des bannettes « à traiter »
  // et « en retard »), plus aucune écriture n'est possible.
  async annuler(id: string, motif: string, user: AuthenticatedUser): Promise<Courrier> {
    const courrier = await this.findOne(id, user);
    if (courrier.annuleLe) throw new ConflictException('Ce courrier est déjà annulé.');
    const motifPropre = motif?.trim();
    if (!motifPropre) throw new BadRequestException("Le motif d'annulation est obligatoire.");
    const autorise = await this.authorizationService.hasPermission(user.id, 'courrier', 'annuler', courrier.entiteId);
    if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à annuler ce courrier");

    await this.dataSource.transaction(async (manager) => {
      await definirAuteur(manager, user.id);
      await manager.update(Courrier, id, { annuleLe: new Date(), annulePar: user.id, motifAnnulation: motifPropre });
      if (courrier.workflowInstanceId) {
        await manager.update(
          WorkflowInstance,
          { id: courrier.workflowInstanceId, statutInstance: 'en_cours' },
          { statutInstance: 'annulee' },
        );
      }
    });
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
      case 'a_suivre':
        return this.bannetteASuivre(user);
    }
  }

  // « À suivre » (recette 2026-11) : courriers en cours des entités dont je suis
  // responsable ou personne réceptrice, et de leurs sous-entités, qui ne sont pas
  // dans ma bannette « À traiter » (donc entre les mains de quelqu'un d'autre).
  private async bannetteASuivre(user: AuthenticatedUser): Promise<Courrier[]> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `select c.id from courriers c
       join workflow_instances wi on wi.id = c.workflow_instance_id
       join entites ec on ec.id = c.entite_id
       where c.organisation_id = $1 and c.supprime_le is null and c.annule_le is null
         and wi.statut_instance = 'en_cours'
         and exists (
           select 1 from entites mien
           where mien.organisation_id = $1
             and (mien.responsable_utilisateur_id = $2 or mien.personne_receptrice_id = $2)
             and mien.chemin OPERATOR(extensions.@>) ec.chemin
         )
       order by c.created_at desc`,
      [user.organisationId, user.id],
    );
    if (rows.length === 0) return [];
    const aTraiter = new Set((await this.bannetteATraiter(user)).map((c) => c.id));
    return this.chargerEtFiltrer(
      rows.map((r) => r.id).filter((id) => !aTraiter.has(id)),
      user,
    );
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
        await resoudreDestinataireCourantCourrier(courrier, this.dataSource),
      );
      if (transitions.length === 0) continue;
      // Recette 2026-11 : un courrier affecté à un autre agent, à l'étape où
      // c'est à cet agent d'agir, relève de « À suivre » pour le responsable
      // (qui garde la possibilité d'agir) et non de son « À traiter ».
      if (courrier.agentDestinataireId && courrier.agentDestinataireId !== user.id) {
        const rows: Array<{ n: number }> = await this.dataSource.query(
          `select count(distinct workflow_transition_id)::int as n from workflow_transition_roles
           where workflow_transition_id = any($1::uuid[]) and type_acteur = 'destinataire_courant'`,
          [transitions.map((t) => t.id)],
        );
        // Toutes les actions possibles sont celles de l'agent : c'est son tour.
        if (rows[0]?.n === transitions.length) continue;
      }
      idsRetenus.push(candidat.id);
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
