import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Projet = Database['public']['Tables']['projets']['Row'];
export type ProjetInsert = Database['public']['Tables']['projets']['Insert'];
export type ProjetUpdate = Database['public']['Tables']['projets']['Update'];

// organisationId n'est pas transmis : le backend le déduit de l'utilisateur
// courant (JWT) — voir server/projets/projets.controller.ts.
export async function listProjets(_organisationId: string): Promise<Projet[]> {
  const data = await api.get<unknown[]>('/projets');
  return toSnakeCase<Projet[]>(data);
}

export async function getProjet(id: string): Promise<Projet> {
  const data = await api.get<unknown>(`/projets/${id}`);
  return toSnakeCase<Projet>(data);
}

export async function createProjet(insert: ProjetInsert): Promise<Projet> {
  const data = await api.post<unknown>('/projets', toCamelCase(insert));
  return toSnakeCase<Projet>(data);
}

export async function updateProjet(id: string, patch: ProjetUpdate): Promise<Projet> {
  const data = await api.patch<unknown>(`/projets/${id}`, toCamelCase(patch));
  return toSnakeCase<Projet>(data);
}

export async function deleteProjet(id: string): Promise<void> {
  await api.delete(`/projets/${id}`);
}
