import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type Avenant = Database['public']['Tables']['avenants']['Row'];
export type AvenantInsert = Database['public']['Tables']['avenants']['Insert'];
export type AvenantUpdate = Database['public']['Tables']['avenants']['Update'];
export type AvenantLivrable = Database['public']['Tables']['avenant_livrables']['Row'];
export type AvenantLivrableInsert = Database['public']['Tables']['avenant_livrables']['Insert'];

export async function listAvenants(projetId: string): Promise<Avenant[]> {
  const { data, error } = await supabase
    .from('avenants')
    .select('*')
    .eq('projet_id', projetId)
    .order('date_avenant', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAvenant(insert: AvenantInsert): Promise<Avenant> {
  const { data, error } = await supabase.from('avenants').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateAvenant(id: string, patch: AvenantUpdate): Promise<Avenant> {
  const { data, error } = await supabase.from('avenants').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteAvenant(id: string): Promise<void> {
  const { error } = await supabase.from('avenants').delete().eq('id', id);
  if (error) throw error;
}

export async function listAvenantLivrables(avenantId: string): Promise<AvenantLivrable[]> {
  const { data, error } = await supabase.from('avenant_livrables').select('*').eq('avenant_id', avenantId);
  if (error) throw error;
  return data ?? [];
}

export async function ajouterAvenantLivrable(insert: AvenantLivrableInsert): Promise<AvenantLivrable> {
  const { data, error } = await supabase.from('avenant_livrables').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function retirerAvenantLivrable(id: string): Promise<void> {
  const { error } = await supabase.from('avenant_livrables').delete().eq('id', id);
  if (error) throw error;
}

export interface AvenantLivrableEntree {
  livrable_id: string | null;
  type_impact: Database['public']['Enums']['type_impact_avenant'];
  echeance_modifiee?: boolean;
  contenu_modifie?: boolean;
}

// Remplace l'ensemble des livrables impactés par cet avenant (même patron
// "remplacer plutôt que diffuser" que definirVisibiliteEntites).
export async function definirAvenantLivrables(avenantId: string, entrees: AvenantLivrableEntree[]): Promise<void> {
  const { error: deleteError } = await supabase.from('avenant_livrables').delete().eq('avenant_id', avenantId);
  if (deleteError) throw deleteError;
  if (entrees.length === 0) return;
  const { error } = await supabase
    .from('avenant_livrables')
    .insert(entrees.map((e) => ({ avenant_id: avenantId, ...e })));
  if (error) throw error;
}
