import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Marche = Database['public']['Tables']['marches']['Row'];
export type MarcheInsert = Database['public']['Tables']['marches']['Insert'];
export type MarcheUpdate = Database['public']['Tables']['marches']['Update'];

export interface ControleClotureMarche {
  bloquant: boolean;
  code: string;
  message: string;
}

// organisation_id n'est pas transmis : le backend le déduit de l'utilisateur
// courant (JWT) — voir server/marches/marches.controller.ts.
export async function listMarches(): Promise<Marche[]> {
  const data = await api.get<unknown[]>('/marches');
  return toSnakeCase<Marche[]>(data);
}

export async function getMarche(id: string): Promise<Marche> {
  const data = await api.get<unknown>(`/marches/${id}`);
  return toSnakeCase<Marche>(data);
}

export async function createMarche(insert: MarcheInsert): Promise<Marche> {
  const data = await api.post<unknown>('/marches', toCamelCase(insert));
  return toSnakeCase<Marche>(data);
}

export async function updateMarche(id: string, patch: MarcheUpdate): Promise<Marche> {
  const data = await api.patch<unknown>(`/marches/${id}`, toCamelCase(patch));
  return toSnakeCase<Marche>(data);
}

export async function deleteMarche(id: string): Promise<void> {
  await api.delete(`/marches/${id}`);
}

export async function verifierClotureMarche(id: string): Promise<ControleClotureMarche[]> {
  const data = await api.get<unknown[]>(`/marches/${id}/verifier-cloture`);
  return toSnakeCase<ControleClotureMarche[]>(data);
}

export async function cloturerMarche(id: string): Promise<Marche> {
  const data = await api.post<unknown>(`/marches/${id}/cloturer`);
  return toSnakeCase<Marche>(data);
}
