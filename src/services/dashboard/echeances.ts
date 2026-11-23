import { api } from '../../config/apiClient';

export type TypeEcheance = 'livrable' | 'courrier' | 'phase_marche';

export interface EcheanceProchaine {
  type: TypeEcheance;
  id: string;
  libelle: string;
  reference: string;
  dateEcheance: string;
  enRetard: boolean;
  lienId: string;
}

// Échéances à venir (livrables, courriers en cours, phases de marché) :
// GET /statistiques/echeances, portée NestJS.
export async function fetchEcheancesProchaines(horizonJours = 30): Promise<EcheanceProchaine[]> {
  return api.get<EcheanceProchaine[]>('/statistiques/echeances', { horizon: horizonJours });
}
