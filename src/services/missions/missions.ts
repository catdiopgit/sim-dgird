import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Mission = Database['public']['Tables']['missions']['Row'];
export type MissionInsert = Database['public']['Tables']['missions']['Insert'];
export type MissionUpdate = Database['public']['Tables']['missions']['Update'];

// organisationId n'est pas transmis : le backend le déduit de l'utilisateur
// courant (JWT) — voir server/missions/missions.controller.ts.
export async function listMissions(_organisationId: string): Promise<Mission[]> {
  const data = await api.get<unknown[]>('/missions');
  return toSnakeCase<Mission[]>(data);
}

export async function getMission(id: string): Promise<Mission> {
  const data = await api.get<unknown>(`/missions/${id}`);
  return toSnakeCase<Mission>(data);
}

export interface CreerMissionInput {
  entite_id: string;
  objet: string;
  responsable_id: string | null;
  lieu: string | null;
  date_depart: string;
  date_retour: string;
  objectifs: string | null;
  activites_prevues: string | null;
  budget_prevu: number | null;
}

export async function creerMission(input: CreerMissionInput): Promise<Mission> {
  const data = await api.post<unknown>('/missions', toCamelCase(input));
  return toSnakeCase<Mission>(data);
}

export async function updateMission(id: string, patch: MissionUpdate): Promise<Mission> {
  const data = await api.patch<unknown>(`/missions/${id}`, toCamelCase(patch));
  return toSnakeCase<Mission>(data);
}

export async function deleteMission(id: string): Promise<void> {
  await api.delete(`/missions/${id}`);
}
