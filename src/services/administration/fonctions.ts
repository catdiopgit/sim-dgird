import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type Fonction = Database['public']['Tables']['fonctions']['Row'];
export type FonctionInsert = Database['public']['Tables']['fonctions']['Insert'];
export type FonctionUpdate = Database['public']['Tables']['fonctions']['Update'];

export async function listFonctions(organisationId: string): Promise<Fonction[]> {
  const { data, error } = await supabase
    .from('fonctions')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('libelle', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createFonction(insert: FonctionInsert): Promise<Fonction> {
  const { data, error } = await supabase.from('fonctions').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateFonction(id: string, patch: FonctionUpdate): Promise<Fonction> {
  const { data, error } = await supabase
    .from('fonctions')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFonction(id: string): Promise<void> {
  const { error } = await supabase.from('fonctions').delete().eq('id', id);
  if (error) throw error;
}
