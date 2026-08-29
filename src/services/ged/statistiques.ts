// Catégorie 9 (reporting/statistiques) : jamais portée côté NestJS — voir
// services/projets/statistiques.ts pour l'explication complète.
const NON_IMPLEMENTE = 'Les statistiques GED ne sont pas encore portées côté serveur (voir MIGRATION.md).';

export interface StatistiquesGedTotaux {
  total: number;
  ajoutesPeriode: number;
}

export interface StatistiquesGedRepartition {
  code: string;
  libelle: string;
  total: number;
}

export interface StatistiquesGedEvolutionPoint {
  date: string;
  total: number;
}

export interface StatistiquesGed {
  totaux: StatistiquesGedTotaux;
  parEtape: StatistiquesGedRepartition[];
  evolution: StatistiquesGedEvolutionPoint[];
}

export async function fetchStatistiquesGed(_dateDebut?: string, _dateFin?: string): Promise<StatistiquesGed> {
  throw new Error(NON_IMPLEMENTE);
}
