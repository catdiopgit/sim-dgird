import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type MissionActionSuivi = Database['public']['Tables']['mission_actions_suivi']['Row'];
export type MissionActionSuiviInsert = Database['public']['Tables']['mission_actions_suivi']['Insert'];
export type MissionActionSuiviUpdate = Database['public']['Tables']['mission_actions_suivi']['Update'];

export async function listActionsSuivi(missionId: string): Promise<MissionActionSuivi[]> {
  const data = await api.get<unknown[]>(`/missions/${missionId}/actions-suivi`);
  return toSnakeCase<MissionActionSuivi[]>(data);
}

export async function creerActionSuivi(insert: MissionActionSuiviInsert): Promise<MissionActionSuivi> {
  const { mission_id, ...rest } = insert as MissionActionSuiviInsert & { mission_id: string };
  const data = await api.post<unknown>(`/missions/${mission_id}/actions-suivi`, toCamelCase(rest));
  return toSnakeCase<MissionActionSuivi>(data);
}

export async function updateActionSuivi(
  missionId: string,
  id: string,
  patch: MissionActionSuiviUpdate,
): Promise<MissionActionSuivi> {
  const data = await api.patch<unknown>(`/missions/${missionId}/actions-suivi/${id}`, toCamelCase(patch));
  return toSnakeCase<MissionActionSuivi>(data);
}

export async function supprimerActionSuivi(missionId: string, id: string): Promise<void> {
  await api.delete(`/missions/${missionId}/actions-suivi/${id}`);
}
