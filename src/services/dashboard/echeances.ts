import { callRpc } from '../rpc';

export type TypeEcheance = 'livrable' | 'action_mission';

export interface EcheanceProchaine {
  type: TypeEcheance;
  id: string;
  libelle: string;
  reference: string;
  dateEcheance: string;
  enRetard: boolean;
  lienId: string;
}

// Une seule fonction serveur (public.fn_echeances_prochaines, migration 0081)
// regroupe les livrables de projets et les actions de suivi de mission dont
// l'échéance approche ou est dépassée, filtrée sur ce que l'utilisateur
// courant peut voir (app.can_view_projet / app.can_view_mission).
export async function fetchEcheancesProchaines(horizonJours = 30): Promise<EcheanceProchaine[]> {
  return callRpc<EcheanceProchaine[]>('fn_echeances_prochaines', { p_horizon_jours: horizonJours });
}
