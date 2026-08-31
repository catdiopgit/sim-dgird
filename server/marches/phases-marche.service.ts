import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import dayjs from 'dayjs';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MarchesService } from './marches.service';
import { PhaseMarche } from './entities/phase-marche.entity';
import { PhaseTypeMarche, type UniteDureePhase } from './entities/phase-type-marche.entity';

export type StatutCalculePhase =
  | 'a_venir'
  | 'en_cours'
  | 'en_retard'
  | 'realisee_a_temps'
  | 'realisee_avance'
  | 'realisee_retard';

export interface PhaseMarcheAvecStatut extends PhaseMarche {
  statutCalcule: StatutCalculePhase;
  ecartJours: number | null;
}

export interface UpdatePhaseMarcheData {
  dateDebutReelle?: string | null;
  dateFinReelle?: string | null;
  observations?: string | null;
}

const UNITE_VERS_DAYJS: Record<UniteDureePhase, 'day' | 'week' | 'month'> = {
  jour: 'day',
  semaine: 'week',
  mois: 'month',
};

// §10/§11/§13 — planification en cascade, saisie des dates réelles, calcul de
// statut. Aucun état n'est stocké pour "à venir / en cours / en retard /
// réalisée (à temps / en avance / en retard)" : tout est recalculé à la
// lecture depuis les 4 dates de PhaseMarche + la date du jour (voir le
// commentaire sur l'entité). Ce service est le pendant, pour les marchés, de
// LivrablesService côté Projets.
@Injectable()
export class PhasesMarcheService {
  constructor(
    @InjectRepository(PhaseMarche) private readonly phasesMarche: Repository<PhaseMarche>,
    @InjectRepository(PhaseTypeMarche) private readonly phasesType: Repository<PhaseTypeMarche>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly marchesService: MarchesService,
  ) {}

  calculerStatut(phase: PhaseMarche, aujourdhui = dayjs()): { statut: StatutCalculePhase; ecartJours: number | null } {
    if (phase.dateFinReelle) {
      if (!phase.dateFinPrevue) return { statut: 'realisee_a_temps', ecartJours: null };
      const ecart = dayjs(phase.dateFinReelle).diff(dayjs(phase.dateFinPrevue), 'day');
      if (ecart < 0) return { statut: 'realisee_avance', ecartJours: ecart };
      if (ecart > 0) return { statut: 'realisee_retard', ecartJours: ecart };
      return { statut: 'realisee_a_temps', ecartJours: 0 };
    }

    if (phase.dateFinPrevue && aujourdhui.isAfter(dayjs(phase.dateFinPrevue), 'day')) {
      return { statut: 'en_retard', ecartJours: aujourdhui.diff(dayjs(phase.dateFinPrevue), 'day') };
    }
    if (phase.dateDebutReelle || (phase.dateDebutPrevue && !aujourdhui.isBefore(dayjs(phase.dateDebutPrevue), 'day'))) {
      return { statut: 'en_cours', ecartJours: null };
    }
    return { statut: 'a_venir', ecartJours: null };
  }

  private avecStatut(phase: PhaseMarche): PhaseMarcheAvecStatut {
    const { statut, ecartJours } = this.calculerStatut(phase);
    return { ...phase, statutCalcule: statut, ecartJours };
  }

  async findAll(marcheId: string, user: AuthenticatedUser): Promise<PhaseMarcheAvecStatut[]> {
    await this.marchesService.findOne(marcheId, user);
    const phases = await this.phasesMarche.find({ where: { marcheId }, order: { ordre: 'ASC' } });
    return phases.map((p) => this.avecStatut(p));
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<PhaseMarcheAvecStatut> {
    const phase = await this.phasesMarche.findOneBy({ id });
    if (!phase) throw new NotFoundException('Phase introuvable');
    await this.marchesService.findOne(phase.marcheId, user);
    return this.avecStatut(phase);
  }

  // §10 : génère les phases depuis le type de marché (première planification)
  // si aucune phase n'existe encore, sinon recalcule uniquement les dates
  // prévisionnelles des phases existantes en cascade depuis la date de début
  // du marché — jamais les dates réelles ni les phases elles-mêmes.
  async planifier(marcheId: string, user: AuthenticatedUser): Promise<PhaseMarcheAvecStatut[]> {
    const marche = await this.marchesService.findOne(marcheId, user);
    await this.marchesService.assertModifiable(marche, user);
    if (!marche.dateDebutPrevue) {
      throw new BadRequestException('La date de début prévisionnelle du marché doit être renseignée avant planification');
    }

    let phases = await this.phasesMarche.find({ where: { marcheId }, order: { ordre: 'ASC' } });

    if (phases.length === 0) {
      const modeles = await this.phasesType.find({
        where: { typeMarcheId: marche.typeMarcheId, actif: true },
        order: { ordre: 'ASC' },
      });
      if (modeles.length === 0) {
        throw new BadRequestException('Le type de marché ne possède aucune phase paramétrée');
      }
      phases = await this.phasesMarche.save(
        modeles.map((modele) =>
          this.phasesMarche.create({
            marcheId,
            phaseTypeMarcheId: modele.id,
            nom: modele.nom,
            description: modele.description,
            ordre: modele.ordre,
            dureePrevue: modele.duree,
            uniteDuree: modele.uniteDuree,
            obligatoire: modele.obligatoire,
          }),
        ),
      );
    }

    let curseur = dayjs(marche.dateDebutPrevue);
    for (const phase of phases) {
      const debut = curseur;
      const fin = debut.add(phase.dureePrevue, UNITE_VERS_DAYJS[phase.uniteDuree]).subtract(1, 'day');
      await this.phasesMarche.update(phase.id, {
        dateDebutPrevue: debut.format('YYYY-MM-DD'),
        dateFinPrevue: fin.format('YYYY-MM-DD'),
      });
      curseur = fin.add(1, 'day');
    }

    const derniereFin = curseur.subtract(1, 'day');
    if (!marche.dateFinPrevue || dayjs(marche.dateFinPrevue).isBefore(derniereFin, 'day')) {
      await this.dataSource.query('update marches set date_fin_prevue = $1 where id = $2', [
        derniereFin.format('YYYY-MM-DD'),
        marcheId,
      ]);
    }

    return this.findAll(marcheId, user);
  }

  async update(id: string, patch: UpdatePhaseMarcheData, user: AuthenticatedUser): Promise<PhaseMarcheAvecStatut> {
    const phase = await this.phasesMarche.findOneBy({ id });
    if (!phase) throw new NotFoundException('Phase introuvable');
    const marche = await this.marchesService.findOne(phase.marcheId, user);
    await this.marchesService.assertModifiable(marche, user);

    await this.phasesMarche.update(id, patch);
    return this.findOne(id, user);
  }

  // §12 : un document justificatif est obligatoire pour valider la
  // réalisation d'une phase. La date de fin réelle (qui détermine le statut
  // "réalisée", voir calculerStatut) n'est enregistrée qu'une fois ce contrôle
  // passé — même principe que LivrablesService.cloturer côté Projets.
  async valider(id: string, user: AuthenticatedUser): Promise<PhaseMarcheAvecStatut> {
    const phase = await this.phasesMarche.findOneBy({ id });
    if (!phase) throw new NotFoundException('Phase introuvable');
    const marche = await this.marchesService.findOne(phase.marcheId, user);
    await this.marchesService.assertModifiable(marche, user);

    if (phase.dateFinReelle) {
      throw new BadRequestException('Cette phase est déjà validée');
    }
    const nbDocuments = await this.dataSource
      .query('select count(*) as count from documents where phase_marche_id = $1 and supprime_le is null', [id])
      .then((rows) => Number(rows[0]?.count ?? 0));
    if (nbDocuments === 0) {
      throw new BadRequestException('Impossible de valider la phase : aucun document justificatif associé');
    }

    // dateDebutReelle ne doit jamais retomber sur la date prévisionnelle : si la
    // phase n'a pas été explicitement démarrée avant validation, la date réelle
    // de début constatée est "aujourd'hui" — repli sur dateDebutPrevue produirait
    // une date de début postérieure à la date de fin quand la planification porte
    // sur le futur (§10), ce qu'un test manuel a révélé.
    const aujourdhui = dayjs().format('YYYY-MM-DD');
    await this.phasesMarche.update(id, {
      dateDebutReelle: phase.dateDebutReelle ?? aujourdhui,
      dateFinReelle: aujourdhui,
    });
    return this.findOne(id, user);
  }

  async demarrer(id: string, user: AuthenticatedUser): Promise<PhaseMarcheAvecStatut> {
    const phase = await this.phasesMarche.findOneBy({ id });
    if (!phase) throw new NotFoundException('Phase introuvable');
    const marche = await this.marchesService.findOne(phase.marcheId, user);
    await this.marchesService.assertModifiable(marche, user);
    if (phase.dateDebutReelle) {
      throw new BadRequestException('Cette phase a déjà démarré');
    }
    await this.phasesMarche.update(id, { dateDebutReelle: dayjs().format('YYYY-MM-DD') });
    return this.findOne(id, user);
  }
}
