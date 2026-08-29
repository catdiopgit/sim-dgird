import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Entite = Database['public']['Tables']['entites']['Row'];
export type EntiteInsert = Database['public']['Tables']['entites']['Insert'];
export type EntiteUpdate = Database['public']['Tables']['entites']['Update'];

export async function listEntites(organisationId: string): Promise<Entite[]> {
  const data = await api.get<unknown[]>('/administration/entites', { organisationId });
  return toSnakeCase<Entite[]>(data);
}

export async function createEntite(insert: EntiteInsert): Promise<Entite> {
  const data = await api.post<unknown>('/administration/entites', toCamelCase(insert));
  return toSnakeCase<Entite>(data);
}

export async function updateEntite(id: string, patch: EntiteUpdate): Promise<Entite> {
  const data = await api.patch<unknown>(`/administration/entites/${id}`, toCamelCase(patch));
  return toSnakeCase<Entite>(data);
}

export async function deleteEntite(id: string): Promise<void> {
  await api.delete(`/administration/entites/${id}`);
}

export interface UtilisateurOption {
  id: string;
  nom: string;
  prenom: string;
}

// Sélecteur léger réutilisé par le formulaire d'entité (responsable) et par les
// autres volets (attribution de rôles, etc.) — pas d'endpoint dédié côté
// backend, on retaille côté client la liste complète des utilisateurs (déjà
// utilisée ailleurs pour l'organisation, volumes faibles ~20 utilisateurs).
export async function listUtilisateursOptions(organisationId: string): Promise<UtilisateurOption[]> {
  const data = await api.get<Array<{ id: string; nom: string; prenom: string }>>(
    '/administration/utilisateurs',
    { organisationId },
  );
  return data.map((u) => ({ id: u.id, nom: u.nom, prenom: u.prenom }));
}
