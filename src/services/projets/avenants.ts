import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Avenant = Database['public']['Tables']['avenants']['Row'];
export type AvenantInsert = Database['public']['Tables']['avenants']['Insert'];
export type AvenantUpdate = Database['public']['Tables']['avenants']['Update'];
export type AvenantLivrable = Database['public']['Tables']['avenant_livrables']['Row'];
export type AvenantLivrableInsert = Database['public']['Tables']['avenant_livrables']['Insert'];

export async function listAvenants(projetId: string): Promise<Avenant[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/avenants`);
  return toSnakeCase<Avenant[]>(data);
}

export async function createAvenant(insert: AvenantInsert): Promise<Avenant> {
  const { projet_id, ...rest } = insert as AvenantInsert & { projet_id: string };
  const data = await api.post<unknown>(`/projets/${projet_id}/avenants`, toCamelCase(rest));
  return toSnakeCase<Avenant>(data);
}

export async function updateAvenant(projetId: string, id: string, patch: AvenantUpdate): Promise<Avenant> {
  const data = await api.patch<unknown>(`/projets/${projetId}/avenants/${id}`, toCamelCase(patch));
  return toSnakeCase<Avenant>(data);
}

export async function deleteAvenant(projetId: string, id: string): Promise<void> {
  await api.delete(`/projets/${projetId}/avenants/${id}`);
}

export async function listAvenantLivrables(projetId: string, avenantId: string): Promise<AvenantLivrable[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/avenants/${avenantId}/livrables`);
  return toSnakeCase<AvenantLivrable[]>(data);
}

export async function ajouterAvenantLivrable(
  projetId: string,
  insert: AvenantLivrableInsert,
): Promise<AvenantLivrable> {
  const { avenant_id, ...rest } = insert as AvenantLivrableInsert & { avenant_id: string };
  const data = await api.post<unknown>(`/projets/${projetId}/avenants/${avenant_id}/livrables`, toCamelCase(rest));
  return toSnakeCase<AvenantLivrable>(data);
}

export async function retirerAvenantLivrable(projetId: string, id: string): Promise<void> {
  await api.delete(`/projets/${projetId}/avenants/livrables/${id}`);
}

export interface AvenantLivrableEntree {
  livrable_id: string | null;
  type_impact: Database['public']['Enums']['type_impact_avenant'];
  echeance_modifiee?: boolean;
  contenu_modifie?: boolean;
}

// Remplace l'ensemble des livrables impactés par cet avenant en une fois
// (même patron "remplacer plutôt que diffuser" que definirVisibiliteEntites).
export async function definirAvenantLivrables(
  projetId: string,
  avenantId: string,
  entrees: AvenantLivrableEntree[],
): Promise<void> {
  await api.put(`/projets/${projetId}/avenants/${avenantId}/livrables`, {
    entrees: entrees.map((e) => toCamelCase(e)),
  });
}
