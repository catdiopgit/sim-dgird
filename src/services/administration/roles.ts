import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type Role = Database['public']['Tables']['roles']['Row'];
export type RoleInsert = Database['public']['Tables']['roles']['Insert'];
export type RoleUpdate = Database['public']['Tables']['roles']['Update'];

// Rôles système (organisation_id null, ex. Administrateur) + rôles propres à
// l'organisation courante — même logique que la policy `roles_select`.
export async function listRoles(organisationId: string): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .or(`organisation_id.eq.${organisationId},organisation_id.is.null`)
    .order('libelle', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createRole(insert: RoleInsert): Promise<Role> {
  const { data, error } = await supabase.from('roles').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

// Les rôles système (systeme = true) sont protégés côté RLS (roles_write ...
// and not systeme) : cet appel échouera proprement avec une erreur RLS si
// tenté sur un rôle système malgré la garde côté UI.
export async function updateRole(id: string, patch: RoleUpdate): Promise<Role> {
  const { data, error } = await supabase.from('roles').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', id);
  if (error) throw error;
}
