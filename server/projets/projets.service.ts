import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { Entite } from '../administration/entites/entities/entite.entity';
import { JournalAudit } from '../common/entities/journal-audit.entity';
import { Projet, type OrganismeExecutionType, type PorteeVisibiliteProjet } from './entities/projet.entity';

export interface CreerProjetData {
  code: string;
  nom: string;
  description?: string | null;
  entiteId: string;
  responsableId?: string | null;
  financement?: string | null;
  coordonnateurId?: string | null;
  lieuExecution?: string | null;
  dateDebut?: string | null;
  dateFinPrevue?: string | null;
  budgetPrevu?: number | null;
  statutValeurId?: string | null;
  prioriteValeurId?: string | null;
  organismeExecutionType?: OrganismeExecutionType;
  organismeExecutionNom?: string | null;
  chargeExecutionUtilisateurId?: string | null;
  chargeExecutionContactId?: string | null;
  porteeVisibilite?: PorteeVisibiliteProjet;
}

// cloture_* et avancement_pct volontairement exclus : gérés exclusivement par
// demanderCloture/confirmerCloture/rejeterCloture et par le trigger SQL de
// recalcul (voir Livrable.poidsPct) — même patron que Courrier (UpdateCourrierData).
export interface UpdateProjetData {
  code?: string;
  nom?: string;
  description?: string | null;
  entiteId?: string;
  responsableId?: string | null;
  financement?: string | null;
  coordonnateurId?: string | null;
  lieuExecution?: string | null;
  dateDebut?: string | null;
  dateFinPrevue?: string | null;
  budgetPrevu?: number | null;
  statutValeurId?: string | null;
  prioriteValeurId?: string | null;
  organismeExecutionType?: OrganismeExecutionType;
  organismeExecutionNom?: string | null;
  chargeExecutionUtilisateurId?: string | null;
  chargeExecutionContactId?: string | null;
  porteeVisibilite?: PorteeVisibiliteProjet;
}

export interface ControleCloture {
  bloquant: boolean;
  code: string;
  message: string;
}

// Portage de app.can_view_projet (0071, dernier corps — la branche sponsor_id
// a été retirée par 0069/0071, remplacée par le champ texte libre `financement`,
// sans équivalent d'accès privilégié), app.can_modifier_projet et
// app.fn_est_responsable_hierarchique (0066), et du workflow de clôture à
// 2 niveaux (0066/0073).
@Injectable()
export class ProjetsService {
  constructor(
    @InjectRepository(Projet) private readonly projets: Repository<Projet>,
    @InjectRepository(Entite) private readonly entites: Repository<Entite>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
  ) {}

  // --- Visibilité / écriture ---

  async canView(projet: Projet, user: AuthenticatedUser): Promise<boolean> {
    if (projet.organisationId !== user.organisationId) return false;
    if (projet.responsableId === user.id || projet.coordonnateurId === user.id) return true;
    if (await this.authorizationService.hasPermission(user.id, 'projets', 'consulter', projet.entiteId)) return true;
    if (await this.estMembreActif(projet.id, user.id)) return true;

    switch (projet.porteeVisibilite) {
      case 'tous':
        return true;
      case 'entites':
        if (!user.entiteId) return false;
        return this.dataSource
          .query('select 1 from projet_visibilite_entites where projet_id = $1 and entite_id = $2 limit 1', [
            projet.id,
            user.entiteId,
          ])
          .then((rows) => rows.length > 0);
      case 'agents':
        return this.dataSource
          .query('select 1 from projet_visibilite_utilisateurs where projet_id = $1 and utilisateur_id = $2 limit 1', [
            projet.id,
            user.id,
          ])
          .then((rows) => rows.length > 0);
      default:
        return false;
    }
  }

  // §4 (0066) : responsable, permission projets/modifier, ou membre actif
  // "contributeur" (peut_modifier). Un projet dont la clôture est confirmée
  // devient lecture seule pour tout le monde.
  async canModifier(projet: Projet, user: AuthenticatedUser): Promise<boolean> {
    if (projet.organisationId !== user.organisationId) return false;
    if (projet.clotureStatut === 'confirmee') return false;
    if (projet.responsableId === user.id) return true;
    if (await this.authorizationService.hasPermission(user.id, 'projets', 'modifier', projet.entiteId)) return true;

    return this.estMembreActif(projet.id, user.id, true);
  }

  async assertModifiable(projet: Projet, user: AuthenticatedUser): Promise<void> {
    if (!(await this.canModifier(projet, user))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce projet");
    }
  }

  private async estMembreActif(projetId: string, utilisateurId: string, exigerPeutModifier = false): Promise<boolean> {
    const rows: Array<{ ok: boolean }> = await this.dataSource.query(
      `select exists (
         select 1 from projet_membres
         where projet_id = $1 and utilisateur_id = $2 and date_retrait is null
           ${exigerPeutModifier ? 'and peut_modifier' : ''}
       ) as ok`,
      [projetId, utilisateurId],
    );
    return rows[0]?.ok ?? false;
  }

  // §8 étape 3 : remonte l'arbre des entités (parent_entite_id) depuis l'entité
  // porteuse pour savoir si l'utilisateur est responsable de cette entité ou
  // d'une de ses entités ancêtres.
  async estResponsableHierarchique(entiteId: string, utilisateurId: string): Promise<boolean> {
    let courant: string | null = entiteId;
    while (courant) {
      const entite = await this.entites.findOneBy({ id: courant });
      if (!entite) return false;
      if (entite.responsableUtilisateurId === utilisateurId) return true;
      courant = entite.parentEntiteId;
    }
    return false;
  }

  // --- Lecture ---

  async findOne(id: string, user: AuthenticatedUser): Promise<Projet> {
    const projet = await this.projets.findOneBy({ id });
    if (!projet || !(await this.canView(projet, user))) {
      throw new NotFoundException('Projet introuvable');
    }
    return projet;
  }

  async findAll(user: AuthenticatedUser): Promise<Projet[]> {
    const projets = await this.projets.find({
      where: { organisationId: user.organisationId },
      order: { updatedAt: 'DESC' },
    });
    const resultats: Projet[] = [];
    for (const projet of projets) {
      if (await this.canView(projet, user)) resultats.push(projet);
    }
    return resultats;
  }

  // --- Création / modification / suppression ---

  async create(data: CreerProjetData, user: AuthenticatedUser): Promise<Projet> {
    if (!(await this.authorizationService.hasPermission(user.id, 'projets', 'creer', data.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à créer un projet pour cette entité");
    }
    try {
      return await this.projets.save(
        this.projets.create({
          organisationId: user.organisationId,
          entiteId: data.entiteId,
          code: data.code,
          nom: data.nom,
          description: data.description ?? null,
          responsableId: data.responsableId ?? null,
          financement: data.financement ?? null,
          coordonnateurId: data.coordonnateurId ?? null,
          lieuExecution: data.lieuExecution ?? null,
          dateDebut: data.dateDebut ?? null,
          dateFinPrevue: data.dateFinPrevue ?? null,
          budgetPrevu: data.budgetPrevu ?? null,
          statutValeurId: data.statutValeurId ?? null,
          prioriteValeurId: data.prioriteValeurId ?? null,
          organismeExecutionType: data.organismeExecutionType ?? 'organisation',
          organismeExecutionNom: data.organismeExecutionNom ?? null,
          chargeExecutionUtilisateurId: data.chargeExecutionUtilisateurId ?? null,
          chargeExecutionContactId: data.chargeExecutionContactId ?? null,
          porteeVisibilite: data.porteeVisibilite ?? 'membres',
          avancementPct: 0,
          clotureStatut: 'aucune',
          createdBy: user.id,
        }),
      );
    } catch (err) {
      throw this.traduireErreurCode(err, data.code);
    }
  }

  async update(id: string, patch: UpdateProjetData, user: AuthenticatedUser): Promise<Projet> {
    const projet = await this.findOne(id, user);
    await this.assertModifiable(projet, user);
    try {
      await this.projets.update(id, patch);
    } catch (err) {
      throw this.traduireErreurCode(err, patch.code ?? projet.code);
    }
    return this.findOne(id, user);
  }

  // Contrainte unique (organisation_id, code) — seul point d'écriture de ce
  // module où une violation de contrainte est une erreur utilisateur courante
  // (code de projet choisi à la main, contrairement au numéro auto-généré de
  // Courrier) : traduite en 409 plutôt que laissée remonter en 500 brut.
  private traduireErreurCode(err: unknown, code: string): unknown {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') {
      return new ConflictException(`Le code de projet '${code}' est déjà utilisé dans cette organisation`);
    }
    return err;
  }

  // Policy d'origine (projets_delete, 0016) jamais retouchée par V2/V3 :
  // réservée à la permission projets/supprimer, indépendamment de
  // responsable/membre.
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const projet = await this.findOne(id, user);
    if (!(await this.authorizationService.hasPermission(user.id, 'projets', 'supprimer', projet.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer ce projet");
    }
    await this.projets.delete(id);
  }

  // --- §9 Checklist de clôture (portage de app.fn_verifier_cloture_projet, 0073) ---

  async verifierCloture(projetId: string, user: AuthenticatedUser): Promise<ControleCloture[]> {
    const projet = await this.findOne(projetId, user);
    const controles: ControleCloture[] = [];

    controles.push({
      bloquant: projet.responsableId == null,
      code: 'responsable',
      message: projet.responsableId == null ? "Le projet n'a pas de responsable désigné." : 'Responsable désigné.',
    });
    controles.push({ bloquant: false, code: 'entite', message: 'Entité porteuse définie.' });

    const poidsRows: Array<{ total: string | null }> = await this.dataSource.query(
      'select coalesce(sum(poids_pct), 0) as total from livrables where projet_id = $1',
      [projetId],
    );
    const poidsTotal = Number(poidsRows[0]?.total ?? 0);
    controles.push({
      bloquant: poidsTotal !== 100,
      code: 'poids_livrables',
      message:
        poidsTotal !== 100
          ? `La somme des quote-parts des livrables est de ${poidsTotal}% (doit être 100%).`
          : 'La somme des quote-parts des livrables est bien de 100%.',
    });

    const incompletsRows: Array<{ count: string }> = await this.dataSource.query(
      `select count(*) as count
       from livrables l
       left join valeurs_listes vl on vl.id = l.statut_valeur_id
       where l.projet_id = $1 and coalesce(vl.code, '') not in ('realise', 'valide', 'annule')`,
      [projetId],
    );
    const nbIncomplets = Number(incompletsRows[0]?.count ?? 0);
    controles.push({
      bloquant: nbIncomplets > 0,
      code: 'livrables_incomplets',
      message:
        nbIncomplets > 0
          ? `${nbIncomplets} livrable(s) à venir, en cours ou en retard.`
          : 'Tous les livrables sont réalisés, validés ou annulés.',
    });

    const sansJustificatifRows: Array<{ count: string }> = await this.dataSource.query(
      `select count(*) as count
       from livrables l
       join valeurs_listes vl on vl.id = l.statut_valeur_id
       where l.projet_id = $1 and vl.code in ('realise', 'valide')
         and not exists (select 1 from documents d where d.livrable_id = l.id and d.supprime_le is null)`,
      [projetId],
    );
    const nbSansJustificatif = Number(sansJustificatifRows[0]?.count ?? 0);
    controles.push({
      bloquant: nbSansJustificatif > 0,
      code: 'livrables_sans_justificatif',
      message:
        nbSansJustificatif > 0
          ? `${nbSansJustificatif} livrable(s) réalisé(s) sans document justificatif.`
          : 'Tous les livrables réalisés disposent d\'un justificatif.',
    });

    const avenantsRows: Array<{ count: string }> = await this.dataSource.query(
      'select count(*) as count from avenants where projet_id = $1',
      [projetId],
    );
    controles.push({
      bloquant: false,
      code: 'avenants',
      message: `${avenantsRows[0]?.count ?? 0} avenant(s) enregistré(s).`,
    });

    const typesRows: Array<{ agg: string | null }> = await this.dataSource.query(
      `select string_agg(vl.libelle, ', ') as agg
       from documents d
       join valeurs_listes vl on vl.id = d.type_projet_valeur_id
       where d.projet_id = $1 and d.supprime_le is null and vl.code in ('tdr', 'contrat', 'ordre-service')`,
      [projetId],
    );
    controles.push({
      bloquant: false,
      code: 'documents_contractuels',
      message:
        typesRows[0]?.agg == null
          ? 'Aucun document contractuel (TDR / contrat / ordre de service) déposé — à vérifier.'
          : `Documents contractuels présents : ${typesRows[0].agg}.`,
    });

    return controles;
  }

  // --- §8 Workflow de clôture à 2 niveaux ---

  // étape 2 : réservé au responsable du projet.
  async demanderCloture(projetId: string, user: AuthenticatedUser): Promise<Projet> {
    const projet = await this.findOne(projetId, user);
    if (projet.responsableId !== user.id) {
      throw new ForbiddenException('Seul le responsable du projet peut demander sa clôture');
    }
    if (projet.clotureStatut === 'confirmee') {
      throw new BadRequestException(`Le projet ${projetId} est déjà clôturé`);
    }
    if (projet.clotureStatut === 'demandee') {
      throw new BadRequestException('Une demande de clôture est déjà en attente de confirmation');
    }

    const controles = await this.verifierCloture(projetId, user);
    const blocages = controles.filter((c) => c.bloquant).map((c) => c.message);
    if (blocages.length > 0) {
      throw new BadRequestException(`Clôture impossible : ${blocages.join(' | ')}`);
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Projet, projetId, {
        clotureStatut: 'demandee',
        clotureDemandeePar: user.id,
        clotureDemandeeLe: new Date(),
        clotureMotifRejet: null,
      });
      await manager.query(
        `insert into journal_audit (utilisateur_id, organisation_id, action_id, objet_type, objet_id, nouvelle_valeur)
         values ($1, $2, (select id from actions where code = 'demander_cloture'), 'projets', $3, $4)`,
        [user.id, projet.organisationId, projetId, JSON.stringify({ cloture_statut: 'demandee' })],
      );
      return manager.findOneByOrFail(Projet, { id: projetId });
    });
  }

  // étape 3 : réservé au responsable de l'entité porteuse, à un supérieur
  // hiérarchique, ou à un rôle disposant de projets/valider.
  async confirmerCloture(projetId: string, commentaire: string | null, user: AuthenticatedUser): Promise<Projet> {
    const projet = await this.findOne(projetId, user);
    if (projet.clotureStatut !== 'demandee') {
      throw new BadRequestException('Aucune demande de clôture en attente pour ce projet');
    }
    const autorise =
      (await this.estResponsableHierarchique(projet.entiteId, user.id)) ||
      (await this.authorizationService.hasPermission(user.id, 'projets', 'valider', projet.entiteId));
    if (!autorise) {
      throw new ForbiddenException(
        "Seul le responsable de l'entité porteuse (ou un supérieur hiérarchique) peut confirmer la clôture",
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const statutTermineRows: Array<{ id: string }> = await manager.query(
        `select vl.id from valeurs_listes vl
         join listes_valeurs l on l.id = vl.liste_id
         where l.organisation_id = $1 and l.code = 'projet_statut' and vl.code = 'termine'`,
        [projet.organisationId],
      );
      await manager.update(Projet, projetId, {
        clotureStatut: 'confirmee',
        clotureConfirmeePar: user.id,
        clotureConfirmeeLe: new Date(),
        dateFinReelle: projet.dateFinReelle ?? new Date().toISOString().slice(0, 10),
        statutValeurId: statutTermineRows[0]?.id ?? projet.statutValeurId,
      });
      await manager.query(
        `insert into journal_audit (utilisateur_id, organisation_id, action_id, objet_type, objet_id, nouvelle_valeur)
         values ($1, $2, (select id from actions where code = 'confirmer_cloture'), 'projets', $3, $4)`,
        [user.id, projet.organisationId, projetId, JSON.stringify({ commentaire: commentaire ?? null })],
      );
      return manager.findOneByOrFail(Projet, { id: projetId });
    });
  }

  async rejeterCloture(projetId: string, motif: string, user: AuthenticatedUser): Promise<Projet> {
    if (!motif || motif.trim() === '') {
      throw new BadRequestException('Un motif est obligatoire pour rejeter une demande de clôture');
    }
    const projet = await this.findOne(projetId, user);
    if (projet.clotureStatut !== 'demandee') {
      throw new BadRequestException('Aucune demande de clôture en attente pour ce projet');
    }
    const autorise =
      (await this.estResponsableHierarchique(projet.entiteId, user.id)) ||
      (await this.authorizationService.hasPermission(user.id, 'projets', 'valider', projet.entiteId));
    if (!autorise) {
      throw new ForbiddenException(
        "Seul le responsable de l'entité porteuse (ou un supérieur hiérarchique) peut rejeter la clôture",
      );
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Projet, projetId, {
        clotureStatut: 'rejetee',
        clotureMotifRejet: motif,
        clotureConfirmeePar: null,
        clotureConfirmeeLe: null,
      });
      await manager.query(
        `insert into journal_audit (utilisateur_id, organisation_id, action_id, objet_type, objet_id, nouvelle_valeur)
         values ($1, $2, (select id from actions where code = 'rejeter_cloture'), 'projets', $3, $4)`,
        [user.id, projet.organisationId, projetId, JSON.stringify({ motif })],
      );
      return manager.findOneByOrFail(Projet, { id: projetId });
    });
  }

  // --- §10 Historique (portage de app.fn_historique_projet, 0073 : plus de
  // branches phases/activites/taches, mortes depuis que l'app ne les utilise
  // plus — voir MIGRATION.md) ---

  async historique(projetId: string, user: AuthenticatedUser): Promise<JournalAudit[]> {
    await this.findOne(projetId, user);
    const rows = await this.dataSource.query(
      `select ja.* from journal_audit ja
       where (ja.objet_type = 'projets' and ja.objet_id = $1)
          or (ja.objet_type = 'livrables' and ja.objet_id in (select id from livrables where projet_id = $1))
          or (ja.objet_type = 'projet_membres' and ja.objet_id in (select id from projet_membres where projet_id = $1))
          or (ja.objet_type = 'avenants' and ja.objet_id in (select id from avenants where projet_id = $1))
          or (ja.objet_type = 'documents' and ja.objet_id in (select id from documents where projet_id = $1))
          or (ja.objet_type = 'decaissements' and ja.objet_id in (select id from decaissements where projet_id = $1))
          or (ja.objet_type = 'projet_contacts_execution' and ja.objet_id in (select id from projet_contacts_execution where projet_id = $1))
       order by ja.created_at desc`,
      [projetId],
    );
    return rows as JournalAudit[];
  }
}
