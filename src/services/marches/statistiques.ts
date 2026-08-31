import { api } from '../../config/apiClient';

export type StatutCalculeMarche = 'a_venir' | 'en_cours' | 'en_retard' | 'termine';

export interface FiltresStatistiquesMarches {
  periodeDebut?: string;
  periodeFin?: string;
  typeMarcheId?: string;
  statut?: StatutCalculeMarche;
  responsableId?: string;
  candidatNom?: string;
}

export interface StatistiquesMarches {
  totaux: { total: number; enCours: number; termines: number; enRetard: number; aVenir: number };
  repartitionParType: Array<{ libelle: string; total: number }>;
  repartitionParStatut: Array<{ statut: StatutCalculeMarche; total: number }>;
  phases: { total: number; realisees: number; enCours: number; enRetard: number; tauxRealisation: number };
  attribution: {
    nbMarchesAttribues: number;
    montantTotalAttribue: number;
    repartitionParCandidat: Array<{ libelle: string; montant: number }>;
  };
  evolution: Array<{ periode: string; total: number }>;
}

// §18-20 — server/marches/marches-statistiques.controller.ts. La réponse est
// un agrégat calculé (pas une ligne de table) déjà en camelCase des deux
// côtés : pas de toCamelCase/toSnakeCase ici, à la différence des services
// qui mirrorent une table (marches.ts, candidats.ts, ...).
export async function fetchStatistiquesMarches(filtres: FiltresStatistiquesMarches): Promise<StatistiquesMarches> {
  return api.get<StatistiquesMarches>('/marches-statistiques', {
    periodeDebut: filtres.periodeDebut,
    periodeFin: filtres.periodeFin,
    typeMarcheId: filtres.typeMarcheId,
    statut: filtres.statut,
    responsableId: filtres.responsableId,
    candidatNom: filtres.candidatNom,
  });
}
