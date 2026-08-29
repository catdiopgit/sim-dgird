import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import { ajouterDocumentMissionAvecFichier } from './documents';
import type { Database } from '../../types/database';

export type MissionDepense = Database['public']['Tables']['mission_depenses']['Row'];
export type MissionDepenseInsert = Database['public']['Tables']['mission_depenses']['Insert'];

export async function listDepenses(missionId: string): Promise<MissionDepense[]> {
  const data = await api.get<unknown[]>(`/missions/${missionId}/depenses`);
  return toSnakeCase<MissionDepense[]>(data);
}

// Le justificatif est obligatoire : contrairement aux décaissements Projets
// (endpoint unique côté serveur), server/missions/mission-depenses.controller.ts
// n'accepte pas de fichier à la création — on recompose ici la même séquence
// à deux étapes que l'ancien flux Supabase (créer la dépense, puis déposer le
// document avec rôle 'depense' + depenseId), avec le même rollback si
// l'upload échoue.
export async function creerDepenseAvecJustificatif(
  insert: MissionDepenseInsert,
  fichier: File,
  titreDocument: string,
): Promise<MissionDepense> {
  const { mission_id, ...rest } = insert as MissionDepenseInsert & { mission_id: string };
  const data = await api.post<unknown>(`/missions/${mission_id}/depenses`, toCamelCase(rest));
  const depense = toSnakeCase<MissionDepense>(data);

  try {
    await ajouterDocumentMissionAvecFichier(
      { p_mission_id: mission_id, p_titre: titreDocument, p_role: 'depense', p_depense_id: depense.id },
      fichier,
    );
  } catch (uploadError) {
    await api.delete(`/missions/${mission_id}/depenses/${depense.id}`);
    throw uploadError;
  }

  return depense;
}

export async function supprimerDepense(missionId: string, id: string): Promise<void> {
  await api.delete(`/missions/${missionId}/depenses/${id}`);
}
