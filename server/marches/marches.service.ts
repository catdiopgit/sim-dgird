import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Marche } from './entities/marche.entity';
import { MarchesAccesService } from './acces/marches-acces.service';
import { MarchesNotificationsService } from './marches-notifications.service';

export interface CreerMarcheData {
  reference: string;
  objet: string;
  description?: string | null;
  entiteId: string;
  typeMarcheId: string;
  responsableId?: string | null;
  dateDebutPrevue?: string | null;
  dateFinPrevue?: string | null;
  montantEstimatif?: number | null;
  observations?: string | null;
}

export interface UpdateMarcheData {
  reference?: string;
  objet?: string;
  description?: string | null;
  entiteId?: string;
  typeMarcheId?: string;
  responsableId?: string | null;
  dateDebutPrevue?: string | null;
  dateFinPrevue?: string | null;
  montantEstimatif?: number | null;
  observations?: string | null;
}

export interface ControleCloture {
  bloquant: boolean;
  code: string;
  message: string;
}

// Pas de notion de "membres du marché" ni de portée de visibilité paramétrable
// (à la différence de Projets, §5 de Gestion de projet V2) : le cahier des
// charges §22 ne demande qu'un contrôle par permission (rôle/portée), géré
// nativement par AuthorizationService.hasPermission (portée organisation/
// entité/entité-et-descendants/personnel définie sur le rôle) — donc pas de
// logique de visibilité bespoke ici, contrairement à ProjetsService.canView.
@Injectable()
export class MarchesService {
  constructor(
    @InjectRepository(Marche) private readonly marches: Repository<Marche>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly acces: MarchesAccesService,
    private readonly notifications: MarchesNotificationsService,
  ) {}

  // Recette 2026-11 : voir MarchesAccesService.peutVoir (cellule, responsable
  // du marché, responsable hiérarchique, portée étendue — plus « personnel »).
  async canView(marche: Marche, user: AuthenticatedUser): Promise<boolean> {
    return this.acces.peutVoir(marche, user);
  }

  // Recette 2026-11 : seuls les membres de la cellule de passation des marchés
  // agissent sur un marché (phases, candidats, attribution, documents).
  async canModifier(marche: Marche, user: AuthenticatedUser): Promise<boolean> {
    if (marche.organisationId !== user.organisationId) return false;
    if (marche.statutCloture === 'cloture') return false;
    return (await this.acces.acces(user)).membre;
  }

  private async assertMembreCellule(user: AuthenticatedUser, action: string): Promise<void> {
    const a = await this.acces.acces(user);
    if (!a.cellule) {
      throw new ForbiddenException(
        "Aucune cellule de passation des marchés n'est définie (paramètre « marches_cellule_entite_id »)",
      );
    }
    if (!a.membre) {
      throw new ForbiddenException(`Seuls les membres de la ${a.cellule.libelle} peuvent ${action}`);
    }
  }

  async assertModifiable(marche: Marche, user: AuthenticatedUser): Promise<void> {
    if (!(await this.canModifier(marche, user))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce marché");
    }
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Marche> {
    const marche = await this.marches.findOneBy({ id });
    if (!marche || !(await this.canView(marche, user))) {
      throw new NotFoundException('Marché introuvable');
    }
    return marche;
  }

  async findAll(user: AuthenticatedUser): Promise<Marche[]> {
    const marches = await this.marches.find({
      where: { organisationId: user.organisationId },
      order: { updatedAt: 'DESC' },
    });
    const resultats: Marche[] = [];
    for (const marche of marches) {
      if (await this.canView(marche, user)) resultats.push(marche);
    }
    return resultats;
  }

  async create(data: CreerMarcheData, user: AuthenticatedUser): Promise<Marche> {
    await this.assertMembreCellule(user, 'créer un marché');
    let cree: Marche;
    try {
      cree = await this.marches.save(
        this.marches.create({
          organisationId: user.organisationId,
          entiteId: data.entiteId,
          reference: data.reference,
          objet: data.objet,
          description: data.description ?? null,
          typeMarcheId: data.typeMarcheId,
          responsableId: data.responsableId ?? null,
          dateDebutPrevue: data.dateDebutPrevue ?? null,
          dateFinPrevue: data.dateFinPrevue ?? null,
          montantEstimatif: data.montantEstimatif ?? null,
          observations: data.observations ?? null,
          statutCloture: 'en_cours',
          createdBy: user.id,
        }),
      );
    } catch (err) {
      throw this.traduireErreurReference(err, data.reference);
    }
    await this.notifications.notifier([cree.responsableId], {
      titre: `Vous êtes responsable du marché ${cree.reference}`,
      message: cree.objet,
      marcheId: cree.id,
      auteurId: user.id,
    });
    return cree;
  }

  // Le recalcul des dates prévisionnelles des phases (§10, "si la date de
  // début prévisionnelle du marché est modifiée, la planification doit être
  // recalculée") est déclenché par PhasesMarcheController après cet update,
  // pas ici, pour ne pas créer de dépendance circulaire Marches<->PhasesMarche.
  async update(id: string, patch: UpdateMarcheData, user: AuthenticatedUser): Promise<Marche> {
    const marche = await this.findOne(id, user);
    await this.assertModifiable(marche, user);
    try {
      await this.marches.update(id, patch);
    } catch (err) {
      throw this.traduireErreurReference(err, patch.reference ?? marche.reference);
    }
    const modifie = await this.findOne(id, user);
    if (patch.responsableId && patch.responsableId !== marche.responsableId) {
      await this.notifications.notifier([patch.responsableId], {
        titre: `Vous êtes responsable du marché ${modifie.reference}`,
        message: modifie.objet,
        marcheId: id,
        auteurId: user.id,
      });
    }
    return modifie;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.findOne(id, user); // 404 si non visible
    if (!(await this.acces.acces(user)).chef) {
      throw new ForbiddenException('Seul le chef de la cellule de passation des marchés peut supprimer un marché');
    }
    await this.marches.delete(id);
  }

  private traduireErreurReference(err: unknown, reference?: string): unknown {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') {
      return new ConflictException(`La référence de marché '${reference}' est déjà utilisée dans cette organisation`);
    }
    return err;
  }

  // §17/§21 : contrôles avant clôture, sur le même principe que
  // ProjetsService.verifierCloture (phases obligatoires réalisées + justificatif).
  async verifierCloture(marcheId: string, user: AuthenticatedUser): Promise<ControleCloture[]> {
    const marche = await this.findOne(marcheId, user);
    const controles: ControleCloture[] = [];

    controles.push({
      bloquant: marche.responsableId == null,
      code: 'responsable',
      message: marche.responsableId == null ? "Le marché n'a pas de responsable désigné." : 'Responsable désigné.',
    });

    const incompletesRows: Array<{ count: string }> = await this.dataSource.query(
      `select count(*) as count
       from phases_marche p
       where p.marche_id = $1 and p.obligatoire and p.date_fin_reelle is null`,
      [marcheId],
    );
    const nbIncompletes = Number(incompletesRows[0]?.count ?? 0);
    controles.push({
      bloquant: nbIncompletes > 0,
      code: 'phases_obligatoires',
      message:
        nbIncompletes > 0
          ? `${nbIncompletes} phase(s) obligatoire(s) non réalisée(s).`
          : 'Toutes les phases obligatoires sont réalisées.',
    });

    const attributionRows: Array<{ count: string }> = await this.dataSource.query(
      'select count(*) as count from marche_attributions where marche_id = $1',
      [marcheId],
    );
    controles.push({
      bloquant: false,
      code: 'attribution',
      message:
        Number(attributionRows[0]?.count ?? 0) > 0
          ? 'Le marché a été attribué.'
          : "Aucune attribution enregistrée pour ce marché — à vérifier.",
    });

    return controles;
  }

  // Pas de workflow de clôture à 2 niveaux (contrairement à Projets, non
  // demandé par §22/§24 pour ce module) : réservé à la permission
  // marches/valider, en une seule étape.
  async cloturer(marcheId: string, user: AuthenticatedUser): Promise<Marche> {
    const marche = await this.findOne(marcheId, user);
    if (marche.statutCloture === 'cloture') {
      throw new BadRequestException('Ce marché est déjà clôturé');
    }
    // Recette 2026-11 : clôture réservée au chef de la cellule de passation.
    if (!(await this.acces.acces(user)).chef) {
      throw new ForbiddenException('Seul le chef de la cellule de passation des marchés peut clôturer un marché');
    }
    const controles = await this.verifierCloture(marcheId, user);
    const blocages = controles.filter((c) => c.bloquant).map((c) => c.message);
    if (blocages.length > 0) {
      throw new BadRequestException(`Clôture impossible : ${blocages.join(' | ')}`);
    }

    await this.marches.update(marcheId, {
      statutCloture: 'cloture',
      cloturePar: user.id,
      clotureLe: new Date(),
    });
    const directeur = await this.dataSource.query('select responsable_utilisateur_id as id from entites where id = $1', [marche.entiteId]);
    await this.notifications.notifier([marche.responsableId, directeur[0]?.id], {
      titre: `Marché clôturé : ${marche.reference}`,
      message: marche.objet,
      marcheId,
      auteurId: user.id,
    });
    return this.findOne(marcheId, user);
  }
}
