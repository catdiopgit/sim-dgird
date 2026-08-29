import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Utilisateur = Database['public']['Tables']['utilisateurs']['Row'];
export type UtilisateurUpdate = Database['public']['Tables']['utilisateurs']['Update'];
export type UtilisateurRole = Database['public']['Tables']['utilisateur_roles']['Row'];
export type UtilisateurRoleInsert = Database['public']['Tables']['utilisateur_roles']['Insert'];

export async function listUtilisateurs(organisationId: string): Promise<Utilisateur[]> {
  const data = await api.get<unknown[]>('/administration/utilisateurs', { organisationId });
  return toSnakeCase<Utilisateur[]>(data);
}

export async function updateUtilisateur(id: string, patch: UtilisateurUpdate): Promise<Utilisateur> {
  const data = await api.patch<unknown>(`/administration/utilisateurs/${id}`, toCamelCase(patch));
  return toSnakeCase<Utilisateur>(data);
}

export interface CreerUtilisateurPayload {
  email: string;
  nom: string;
  prenom: string;
  entiteId?: string | null;
  fonctionId?: string | null;
  matricule?: string | null;
  telephone?: string | null;
}

export interface CreerUtilisateurResultat {
  id: string;
  email: string;
  motDePasseTemporaire: string;
}

// Remplace l'Edge Function `creer-utilisateur` : couvert par
// POST /administration/utilisateurs (server/administration/utilisateurs), déjà
// gardé par permission `utilisateurs/creer` — voir MIGRATION.md Phase 1.
export async function creerUtilisateur(
  payload: CreerUtilisateurPayload,
): Promise<CreerUtilisateurResultat> {
  return api.post<CreerUtilisateurResultat>('/administration/utilisateurs', payload);
}

export async function listUtilisateurRoles(utilisateurId: string): Promise<UtilisateurRole[]> {
  const data = await api.get<unknown[]>('/administration/roles/attributions', { utilisateurId });
  return toSnakeCase<UtilisateurRole[]>(data);
}

export async function assignerRole(insert: UtilisateurRoleInsert): Promise<UtilisateurRole> {
  const data = await api.post<unknown>('/administration/roles/attributions', toCamelCase(insert));
  return toSnakeCase<UtilisateurRole>(data);
}

export async function revoquerRole(id: string): Promise<void> {
  await api.delete(`/administration/roles/attributions/${id}`);
}
