import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type MarcheCandidat = Database['public']['Tables']['marche_candidats']['Row'];
export type MarcheCandidatInsert = Database['public']['Tables']['marche_candidats']['Insert'];
export type MarcheCandidatUpdate = Database['public']['Tables']['marche_candidats']['Update'];

// §15 — server/marches/marche-candidats.controller.ts.
export async function listMarcheCandidats(marcheId: string): Promise<MarcheCandidat[]> {
  const data = await api.get<unknown[]>(`/marches/${marcheId}/candidats`);
  return toSnakeCase<MarcheCandidat[]>(data);
}

export async function createMarcheCandidat(
  marcheId: string,
  insert: Omit<MarcheCandidatInsert, 'marche_id'>,
): Promise<MarcheCandidat> {
  const data = await api.post<unknown>(`/marches/${marcheId}/candidats`, toCamelCase(insert));
  return toSnakeCase<MarcheCandidat>(data);
}

export async function updateMarcheCandidat(
  marcheId: string,
  id: string,
  patch: MarcheCandidatUpdate,
): Promise<MarcheCandidat> {
  const data = await api.patch<unknown>(`/marches/${marcheId}/candidats/${id}`, toCamelCase(patch));
  return toSnakeCase<MarcheCandidat>(data);
}

export async function deleteMarcheCandidat(marcheId: string, id: string): Promise<void> {
  await api.delete(`/marches/${marcheId}/candidats/${id}`);
}
