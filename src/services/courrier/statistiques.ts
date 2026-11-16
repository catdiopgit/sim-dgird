import { api } from '../../config/apiClient';

// Statistiques Courrier : GET /statistiques/courrier (module NestJS
// statistiques, v8.3), calculées sur les courriers visibles par l'utilisateur.

export interface StatistiquesCourrierTotaux {
  total: number;
  entrant: number;
  sortant: number;
  interne: number;
}

export interface StatistiquesCourrierParEtat {
  enCours: number;
  enRetard: number;
  clotures: number;
}

export interface StatistiquesCourrierRepartition {
  id: string;
  libelle: string;
  total: number;
}

export interface StatistiquesCourrierEvolutionPoint {
  date: string;
  total: number;
}

export interface StatistiquesCourrier {
  totaux: StatistiquesCourrierTotaux;
  parEtat: StatistiquesCourrierParEtat;
  parEntite: StatistiquesCourrierRepartition[];
  parType: StatistiquesCourrierRepartition[];
  parPriorite: StatistiquesCourrierRepartition[];
  delaiMoyenJours: number | null;
  evolution: StatistiquesCourrierEvolutionPoint[];
}

export async function fetchStatistiquesCourrier(dateDebut?: string, dateFin?: string): Promise<StatistiquesCourrier> {
  return api.get<StatistiquesCourrier>('/statistiques/courrier', { dateDebut, dateFin });
}
