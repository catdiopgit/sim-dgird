import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Fonction = Database['public']['Tables']['fonctions']['Row'];
export type FonctionInsert = Database['public']['Tables']['fonctions']['Insert'];
export type FonctionUpdate = Database['public']['Tables']['fonctions']['Update'];

export async function listFonctions(organisationId: string): Promise<Fonction[]> {
  const data = await api.get<unknown[]>('/administration/fonctions', { organisationId });
  return toSnakeCase<Fonction[]>(data);
}

export async function createFonction(insert: FonctionInsert): Promise<Fonction> {
  const data = await api.post<unknown>('/administration/fonctions', toCamelCase(insert));
  return toSnakeCase<Fonction>(data);
}

export async function updateFonction(id: string, patch: FonctionUpdate): Promise<Fonction> {
  const data = await api.patch<unknown>(`/administration/fonctions/${id}`, toCamelCase(patch));
  return toSnakeCase<Fonction>(data);
}

export async function deleteFonction(id: string): Promise<void> {
  await api.delete(`/administration/fonctions/${id}`);
}
