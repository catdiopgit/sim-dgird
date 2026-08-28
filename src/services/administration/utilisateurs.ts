import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type Utilisateur = Database['public']['Tables']['utilisateurs']['Row'];
export type UtilisateurUpdate = Database['public']['Tables']['utilisateurs']['Update'];
export type UtilisateurRole = Database['public']['Tables']['utilisateur_roles']['Row'];
export type UtilisateurRoleInsert = Database['public']['Tables']['utilisateur_roles']['Insert'];

export async function listUtilisateurs(organisationId: string): Promise<Utilisateur[]> {
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('nom', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateUtilisateur(id: string, patch: UtilisateurUpdate): Promise<Utilisateur> {
  const { data, error } = await supabase
    .from('utilisateurs')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
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

export async function creerUtilisateur(
  payload: CreerUtilisateurPayload,
): Promise<CreerUtilisateurResultat> {
  const { data, error } = await supabase.functions.invoke<CreerUtilisateurResultat>('creer-utilisateur', {
    body: payload,
  });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const corps = (await error.context.json()) as { error?: string };
        message = corps?.error ?? message;
      } catch {
        // Corps non-JSON : on garde le message par défaut.
      }
    }
    throw new Error(message);
  }
  if (!data) throw new Error('Réponse vide de la fonction de création.');
  return data;
}

export async function listUtilisateurRoles(utilisateurId: string): Promise<UtilisateurRole[]> {
  const { data, error } = await supabase
    .from('utilisateur_roles')
    .select('*')
    .eq('utilisateur_id', utilisateurId)
    .order('date_debut', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function assignerRole(insert: UtilisateurRoleInsert): Promise<UtilisateurRole> {
  const { data, error } = await supabase.from('utilisateur_roles').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function revoquerRole(id: string): Promise<void> {
  const { error } = await supabase.from('utilisateur_roles').delete().eq('id', id);
  if (error) throw error;
}
