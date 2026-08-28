import { callRpc } from '../rpc';
import type { Database } from '../../types/database';

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

// Une seule fonction serveur (public.fn_statistiques_projets, migration
// 0076) agrège tout — un seul aller-retour réseau, un seul état de
// chargement côté client. Même patron que fetchStatistiquesCourrier.
export async function fetchStatistiquesProjets(filtres: FiltresStatistiquesProjets): Promise<StatistiquesProjets> {
  return callRpc<StatistiquesProjets>('fn_statistiques_projets', {
    p_date_debut: filtres.dateDebut ?? null,
    p_date_fin: filtres.dateFin ?? null,
    p_statut_valeur_id: filtres.statutValeurId ?? null,
    p_responsable_id: filtres.responsableId ?? null,
    p_organisme_execution_type: filtres.organismeExecutionType ?? null,
  });
}
