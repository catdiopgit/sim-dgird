import { callRpc } from '../rpc';

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

// Une seule fonction serveur (public.fn_statistiques_ged, migration 0080)
// agrège tout, même patron que fetchStatistiquesCourrier. Dates au format
// YYYY-MM-DD (ou undefined = pas de borne).
export async function fetchStatistiquesGed(dateDebut?: string, dateFin?: string): Promise<StatistiquesGed> {
  return callRpc<StatistiquesGed>('fn_statistiques_ged', {
    p_date_debut: dateDebut ?? null,
    p_date_fin: dateFin ?? null,
  });
}
