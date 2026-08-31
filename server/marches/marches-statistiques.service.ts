import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import dayjs from 'dayjs';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MarchesService } from './marches.service';
import { PhasesMarcheService } from './phases-marche.service';
import type { Marche } from './entities/marche.entity';

export type StatutCalculeMarche = 'a_venir' | 'en_cours' | 'en_retard' | 'termine';

export interface FiltresStatistiquesMarches {
  periodeDebut?: string;
  periodeFin?: string;
  typeMarcheId?: string;
  statut?: StatutCalculeMarche;
  responsableId?: string;
  candidatNom?: string;
}

// §18-20 : aucune infrastructure de statistiques serveur n'existe ailleurs
// dans l'application (les fn_statistiques_* Supabase n'ont jamais été portées
// — voir MIGRATION.md) : il n'y a donc rien à adapter, ce service part de
// zéro. Plutôt que de dupliquer en SQL brut la logique de visibilité de
// MarchesService.canView (organisation + portée de permission), on réutilise
// findAll() (déjà filtré) puis on agrège en mémoire — cohérent avec l'échelle
// institutionnelle de l'application et avec le choix déjà fait ailleurs de ne
// pas réintroduire de RLS applicative dupliquée en SQL.
@Injectable()
export class MarchesStatistiquesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly marchesService: MarchesService,
    private readonly phasesMarcheService: PhasesMarcheService,
  ) {}

  private statutMarche(marche: Marche, phases: Array<{ statutCalcule: string }>): StatutCalculeMarche {
    if (marche.statutCloture === 'cloture') return 'termine';
    if (phases.some((p) => p.statutCalcule === 'en_retard')) return 'en_retard';
    if (!marche.dateDebutPrevue || dayjs(marche.dateDebutPrevue).isAfter(dayjs(), 'day')) return 'a_venir';
    return 'en_cours';
  }

  async obtenirStatistiques(filtres: FiltresStatistiquesMarches, user: AuthenticatedUser) {
    const marches = await this.marchesService.findAll(user);
    const marcheIds = marches.map((m) => m.id);

    const phasesParMarche = new Map<string, Awaited<ReturnType<PhasesMarcheService['findAll']>>>();
    for (const marcheId of marcheIds) {
      phasesParMarche.set(marcheId, await this.phasesMarcheService.findAll(marcheId, user));
    }

    const attributions: Array<{
      marche_id: string;
      candidat_attributaire_id: string;
      montant_attribue: string | null;
      candidat_nom: string;
    }> =
      marcheIds.length === 0
        ? []
        : await this.dataSource.query(
            `select a.marche_id, a.candidat_attributaire_id, a.montant_attribue, c.nom as candidat_nom
             from marche_attributions a
             join marche_candidats c on c.id = a.candidat_attributaire_id
             where a.marche_id = any($1::uuid[])`,
            [marcheIds],
          );
    const attributionParMarche = new Map(attributions.map((a) => [a.marche_id, a]));

    const typesRows: Array<{ id: string; libelle: string }> = await this.dataSource.query(
      'select id, libelle from types_marche where organisation_id = $1',
      [user.organisationId],
    );
    const libelleType = new Map(typesRows.map((t) => [t.id, t.libelle]));

    type Ligne = { marche: Marche; statut: StatutCalculeMarche; phases: ReturnType<typeof phasesParMarche.get> };
    let lignes: Ligne[] = marches.map((marche) => ({
      marche,
      statut: this.statutMarche(marche, phasesParMarche.get(marche.id) ?? []),
      phases: phasesParMarche.get(marche.id),
    }));

    if (filtres.periodeDebut) {
      lignes = lignes.filter((l) => l.marche.dateDebutPrevue && l.marche.dateDebutPrevue >= filtres.periodeDebut!);
    }
    if (filtres.periodeFin) {
      lignes = lignes.filter((l) => l.marche.dateDebutPrevue && l.marche.dateDebutPrevue <= filtres.periodeFin!);
    }
    if (filtres.typeMarcheId) {
      lignes = lignes.filter((l) => l.marche.typeMarcheId === filtres.typeMarcheId);
    }
    if (filtres.statut) {
      lignes = lignes.filter((l) => l.statut === filtres.statut);
    }
    if (filtres.responsableId) {
      lignes = lignes.filter((l) => l.marche.responsableId === filtres.responsableId);
    }
    if (filtres.candidatNom) {
      const recherche = filtres.candidatNom.toLowerCase();
      lignes = lignes.filter((l) => attributionParMarche.get(l.marche.id)?.candidat_nom?.toLowerCase().includes(recherche));
    }

    const totaux = {
      total: lignes.length,
      enCours: lignes.filter((l) => l.statut === 'en_cours').length,
      termines: lignes.filter((l) => l.statut === 'termine').length,
      enRetard: lignes.filter((l) => l.statut === 'en_retard').length,
      aVenir: lignes.filter((l) => l.statut === 'a_venir').length,
    };

    const parType = new Map<string, number>();
    const parStatut: Record<StatutCalculeMarche, number> = { a_venir: 0, en_cours: 0, en_retard: 0, termine: 0 };
    let phasesRealisees = 0;
    let phasesEnCours = 0;
    let phasesEnRetard = 0;
    let phasesTotal = 0;
    let montantTotalAttribue = 0;
    let nbMarchesAttribues = 0;
    const parCandidat = new Map<string, number>();

    for (const ligne of lignes) {
      const libelle = libelleType.get(ligne.marche.typeMarcheId) ?? 'Non renseigné';
      parType.set(libelle, (parType.get(libelle) ?? 0) + 1);
      parStatut[ligne.statut] += 1;

      for (const phase of ligne.phases ?? []) {
        phasesTotal += 1;
        if (phase.statutCalcule.startsWith('realisee')) phasesRealisees += 1;
        else if (phase.statutCalcule === 'en_cours') phasesEnCours += 1;
        else if (phase.statutCalcule === 'en_retard') phasesEnRetard += 1;
      }

      const attribution = attributionParMarche.get(ligne.marche.id);
      if (attribution) {
        nbMarchesAttribues += 1;
        const montant = Number(attribution.montant_attribue ?? 0);
        montantTotalAttribue += montant;
        parCandidat.set(attribution.candidat_nom, (parCandidat.get(attribution.candidat_nom) ?? 0) + montant);
      }
    }

    const evolution = new Map<string, number>();
    for (const ligne of lignes) {
      if (!ligne.marche.dateDebutPrevue) continue;
      const cle = dayjs(ligne.marche.dateDebutPrevue).format('YYYY-MM');
      evolution.set(cle, (evolution.get(cle) ?? 0) + 1);
    }

    return {
      totaux,
      repartitionParType: [...parType.entries()].map(([libelle, total]) => ({ libelle, total })),
      repartitionParStatut: Object.entries(parStatut).map(([statut, total]) => ({ statut, total })),
      phases: {
        total: phasesTotal,
        realisees: phasesRealisees,
        enCours: phasesEnCours,
        enRetard: phasesEnRetard,
        tauxRealisation: phasesTotal > 0 ? Math.round((phasesRealisees / phasesTotal) * 100) : 0,
      },
      attribution: {
        nbMarchesAttribues,
        montantTotalAttribue,
        repartitionParCandidat: [...parCandidat.entries()].map(([libelle, montant]) => ({ libelle, montant })),
      },
      evolution: [...evolution.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([periode, total]) => ({ periode, total })),
    };
  }
}
