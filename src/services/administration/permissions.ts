import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type ModuleRef = Database['public']['Tables']['modules']['Row'];
export type ActionRef = Database['public']['Tables']['actions']['Row'];
export type Permission = Database['public']['Tables']['permissions']['Row'];
export type PermissionInsert = Database['public']['Tables']['permissions']['Insert'];
export type Portee = Database['public']['Enums']['portee_permission'];

// Référentiels système globaux (mêmes pour toutes les organisations) — lecture
// ouverte à tout authentifié (policies modules_select / actions_select).
export async function listModules(): Promise<ModuleRef[]> {
  const { data, error } = await supabase.from('modules').select('*').order('ordre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listActions(): Promise<ActionRef[]> {
  const { data, error } = await supabase.from('actions').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function listPermissionsForRole(roleId: string): Promise<Permission[]> {
  const { data, error } = await supabase.from('permissions').select('*').eq('role_id', roleId);
  if (error) throw error;
  return data ?? [];
}

export async function createPermission(insert: PermissionInsert): Promise<Permission> {
  const { data, error } = await supabase.from('permissions').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updatePermissionPortee(id: string, portee: Portee): Promise<Permission> {
  const { data, error } = await supabase
    .from('permissions')
    .update({ portee })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deletePermission(id: string): Promise<void> {
  const { error } = await supabase.from('permissions').delete().eq('id', id);
  if (error) throw error;
}
