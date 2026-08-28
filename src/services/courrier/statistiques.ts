import { callRpc } from '../rpc';

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

// Une seule fonction serveur (public.fn_statistiques_courrier, migration
// 0055) agrège tout — un seul aller-retour réseau, un seul état de
// chargement côté client. Dates au format YYYY-MM-DD (ou undefined = pas de
// borne, toute la période).
export async function fetchStatistiquesCourrier(
  dateDebut?: string,
  dateFin?: string,
): Promise<StatistiquesCourrier> {
  return callRpc<StatistiquesCourrier>('fn_statistiques_courrier', {
    p_date_debut: dateDebut ?? null,
    p_date_fin: dateFin ?? null,
  });
}
