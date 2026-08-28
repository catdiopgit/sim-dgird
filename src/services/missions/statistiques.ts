import { callRpc } from '../rpc';

export interface StatistiquesMissionsTotaux {
  total: number;
  enCours: number;
  aVenir: number;
  enRetard: number;
  clotures: number;
}

export interface StatistiquesMissionsRepartition {
  code?: string;
  id?: string;
  libelle: string;
  total: number;
}

export interface StatistiquesMissionsFinancier {
  budgetPrevu: number;
  budgetReel: number;
  ecart: number;
  pourcentageRealise: number;
}

export interface StatistiquesMissionsParticipants {
  total: number;
  moyenneParMission: number;
}

export interface StatistiquesMissionsEvolutionPoint {
  date: string;
  total: number;
}

export interface StatistiquesMissions {
  totaux: StatistiquesMissionsTotaux;
  dureeMoyenneJours: number | null;
  parEtape: StatistiquesMissionsRepartition[];
  parEntite: StatistiquesMissionsRepartition[];
  parResponsable: StatistiquesMissionsRepartition[];
  financier: StatistiquesMissionsFinancier;
  participants: StatistiquesMissionsParticipants;
  evolution: StatistiquesMissionsEvolutionPoint[];
}

export interface FiltresStatistiquesMissions {
  dateDebut?: string;
  dateFin?: string;
  entiteId?: string;
  responsableId?: string;
  etapeCode?: string;
}

// Une seule fonction serveur (public.fn_statistiques_missions, migration
// 0079) agrège tout — un seul aller-retour réseau, un seul état de
// chargement côté client. Même patron que fetchStatistiquesProjets.
export async function fetchStatistiquesMissions(filtres: FiltresStatistiquesMissions): Promise<StatistiquesMissions> {
  return callRpc<StatistiquesMissions>('fn_statistiques_missions', {
    p_date_debut: filtres.dateDebut ?? null,
    p_date_fin: filtres.dateFin ?? null,
    p_entite_id: filtres.entiteId ?? null,
    p_responsable_id: filtres.responsableId ?? null,
    p_etape_code: filtres.etapeCode ?? null,
  });
}
