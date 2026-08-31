import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { Marche } from './entities/marche.entity';

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
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canView(marche: Marche, user: AuthenticatedUser): Promise<boolean> {
    if (marche.organisationId !== user.organisationId) return false;
    if (marche.responsableId === user.id) return true;
    return this.authorizationService.hasPermission(user.id, 'marches', 'consulter', marche.entiteId);
  }

  async canModifier(marche: Marche, user: AuthenticatedUser): Promise<boolean> {
    if (marche.organisationId !== user.organisationId) return false;
    if (marche.statutCloture === 'cloture') return false;
    if (marche.responsableId === user.id) return true;
    return this.authorizationService.hasPermission(user.id, 'marches', 'modifier', marche.entiteId);
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
    if (!(await this.authorizationService.hasPermission(user.id, 'marches', 'creer', data.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à créer un marché pour cette entité");
    }
    try {
      return await this.marches.save(
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
    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const marche = await this.findOne(id, user);
    if (!(await this.authorizationService.hasPermission(user.id, 'marches', 'supprimer', marche.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer ce marché");
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
    if (!(await this.authorizationService.hasPermission(user.id, 'marches', 'valider', marche.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à clôturer ce marché");
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
    return this.findOne(marcheId, user);
  }
}
