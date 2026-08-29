import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type MissionParticipant = Database['public']['Tables']['mission_participants']['Row'];
export type MissionParticipantInsert = Database['public']['Tables']['mission_participants']['Insert'];

export async function listParticipants(missionId: string): Promise<MissionParticipant[]> {
  const data = await api.get<unknown[]>(`/missions/${missionId}/participants`);
  return toSnakeCase<MissionParticipant[]>(data);
}

export async function ajouterParticipant(insert: MissionParticipantInsert): Promise<MissionParticipant> {
  const { mission_id, ...rest } = insert as MissionParticipantInsert & { mission_id: string };
  const data = await api.post<unknown>(`/missions/${mission_id}/participants`, toCamelCase(rest));
  return toSnakeCase<MissionParticipant>(data);
}

export async function retirerParticipant(missionId: string, id: string): Promise<void> {
  await api.delete(`/missions/${missionId}/participants/${id}`);
}
