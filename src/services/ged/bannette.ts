import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { GedVersement } from './versements';

// Miroir de la bannette 'a_traiter' de Courrier : versements visibles dont
// l'utilisateur courant satisfait l'acteur d'au moins une transition
// disponible à l'étape courante.
export async function listVersementsATraiter(): Promise<GedVersement[]> {
  const data = await api.get<unknown[]>('/ged/versements/bannette/a-traiter');
  return toSnakeCase<GedVersement[]>(data);
}
