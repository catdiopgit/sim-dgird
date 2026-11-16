import { api } from '../../config/apiClient';
import type { Database } from '../../types/database';

// Statistiques Projets : GET /statistiques/projets (module NestJS
// statistiques, v8.3), calculées sur les projets visibles par l'utilisateur.

export interface StatistiquesProjetsTotaux {
  total: number;
  enCours: number;
  aVenir: number;
  enRetard: number;
  clotures: number;
}

export interface StatistiquesProjetsRepartition {
  id: string;
  libelle: string;
  couleur: string | null;
  total: number;
}

export interface StatistiquesProjetsRepartitionOrganisme {
  cle: Database['public']['Enums']['organisme_execution_type'];
  total: number;
}

export interface StatistiquesProjetsFinancier {
  montantProjets: number;
  montantAvenants: number;
  montantContractuel: number;
  montantDecaisse: number;
  pourcentageDecaisse: number;
  resteADecaisser: number;
}

export interface StatistiquesProjetsLivrables {
  total: number;
  realises: number;
  enCoursOuNonRealises: number;
  tauxRealisation: number;
}

export interface StatistiquesProjetsEvolutionPoint {
  date: string;
  total: number;
}

export interface StatistiquesProjets {
  totaux: StatistiquesProjetsTotaux;
  avancementMoyen: number | null;
  parEtat: StatistiquesProjetsRepartition[];
  parOrganisme: StatistiquesProjetsRepartitionOrganisme[];
  parResponsable: { id: string; libelle: string; total: number }[];
  financier: StatistiquesProjetsFinancier;
  livrables: StatistiquesProjetsLivrables;
  evolution: StatistiquesProjetsEvolutionPoint[];
}

export interface FiltresStatistiquesProjets {
  dateDebut?: string;
  dateFin?: string;
  statutValeurId?: string;
  responsableId?: string;
  organismeExecutionType?: Database['public']['Enums']['organisme_execution_type'];
}

export async function fetchStatistiquesProjets(filtres: FiltresStatistiquesProjets): Promise<StatistiquesProjets> {
  return api.get<StatistiquesProjets>('/statistiques/projets', { ...filtres });
}
