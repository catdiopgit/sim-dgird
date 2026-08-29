// Catégorie 9 (reporting/statistiques) : jamais portée côté NestJS — voir
// services/projets/statistiques.ts pour l'explication complète (dépendance à
// app.current_organisation_id(), fonction de session RLS Supabase absente en
// NestJS). Stub explicite plutôt qu'un appel cassé.
const NON_IMPLEMENTE = 'Les statistiques Courrier ne sont pas encore portées côté serveur (voir MIGRATION.md).';

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

export async function fetchStatistiquesCourrier(
  _dateDebut?: string,
  _dateFin?: string,
): Promise<StatistiquesCourrier> {
  throw new Error(NON_IMPLEMENTE);
}
