import { api } from '../../config/apiClient';

// Statistiques Missions : GET /statistiques/missions (module NestJS
// statistiques, v8.3), calculées sur les missions visibles par l'utilisateur.

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

export async function fetchStatistiquesMissions(filtres: FiltresStatistiquesMissions): Promise<StatistiquesMissions> {
  return api.get<StatistiquesMissions>('/statistiques/missions', { ...filtres });
}
