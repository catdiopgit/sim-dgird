import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type TypeEntite = Database['public']['Tables']['type_entites']['Row'];
export type TypeEntiteInsert = Database['public']['Tables']['type_entites']['Insert'];
export type TypeEntiteUpdate = Database['public']['Tables']['type_entites']['Update'];

export async function listTypeEntites(organisationId: string): Promise<TypeEntite[]> {
  const { data, error } = await supabase
    .from('type_entites')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('ordre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTypeEntite(insert: TypeEntiteInsert): Promise<TypeEntite> {
  const { data, error } = await supabase.from('type_entites').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateTypeEntite(id: string, patch: TypeEntiteUpdate): Promise<TypeEntite> {
  const { data, error } = await supabase
    .from('type_entites')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTypeEntite(id: string): Promise<void> {
  const { error } = await supabase.from('type_entites').delete().eq('id', id);
  if (error) throw error;
}
