// Catégorie 9 (reporting/statistiques) : jamais portée côté NestJS — voir
// services/projets/statistiques.ts pour l'explication complète.
const NON_IMPLEMENTE = 'Les statistiques Missions ne sont pas encore portées côté serveur (voir MIGRATION.md).';

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

export async function fetchStatistiquesMissions(_filtres: FiltresStatistiquesMissions): Promise<StatistiquesMissions> {
  throw new Error(NON_IMPLEMENTE);
}
