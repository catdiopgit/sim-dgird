import { callRpc } from '../rpc';
import type { GedVersement } from './versements';

// Miroir de la bannette 'a_traiter' de Courrier (fn_bannettes_courrier, 0049) :
// versements visibles dont l'utilisateur courant satisfait l'acteur d'au
// moins une transition disponible à l'étape courante.
export async function listVersementsATraiter(): Promise<GedVersement[]> {
  return callRpc<GedVersement[]>('fn_bannette_ged');
}
