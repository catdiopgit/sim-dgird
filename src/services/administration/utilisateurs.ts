import { api, setToken } from '../../config/apiClient';
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

// v8.6.5 : réinitialisation du mot de passe par l'administrateur (nouveau mot
// de passe temporaire, à changer à la prochaine connexion).
export async function reinitialiserMotDePasse(utilisateurId: string): Promise<{ email: string; motDePasseTemporaire: string }> {
  return api.post<{ email: string; motDePasseTemporaire: string }>(
    `/administration/utilisateurs/${utilisateurId}/reinitialiser-mot-de-passe`,
    {},
  );
}

// v8.6.5 : changement de son propre mot de passe.
export async function changerMonMotDePasse(actuel: string, nouveau: string): Promise<void> {
  // v8.6.6 : les anciens jetons sont révoqués ; le serveur en remet un nouveau.
  const r = await api.post<{ accessToken?: string }>('/auth/mot-de-passe', { actuel, nouveau });
  if (r?.accessToken) setToken(r.accessToken);
}

// v8.6.9 : lien d'activation à usage unique envoyé par e-mail (l'agent choisit
// lui-même son mot de passe ; aucun mot de passe ne circule).
export async function envoyerLienActivation(utilisateurId: string): Promise<{ ok: boolean; message: string }> {
  return api.post<{ ok: boolean; message: string }>(`/administration/utilisateurs/${utilisateurId}/envoyer-activation`, {});
}

export async function verifierLienActivation(jeton: string): Promise<{ email: string; prenom: string }> {
  return api.get<{ email: string; prenom: string }>('/auth/activation', { jeton });
}

export async function activerCompte(jeton: string, nouveau: string): Promise<{ ok: boolean; email: string }> {
  return api.post<{ ok: boolean; email: string }>('/auth/activation', { jeton, nouveau });
}
