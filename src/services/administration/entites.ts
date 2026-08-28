import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type Entite = Database['public']['Tables']['entites']['Row'];
export type EntiteInsert = Database['public']['Tables']['entites']['Insert'];
export type EntiteUpdate = Database['public']['Tables']['entites']['Update'];

export async function listEntites(organisationId: string): Promise<Entite[]> {
  const { data, error } = await supabase
    .from('entites')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('ordre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createEntite(insert: EntiteInsert): Promise<Entite> {
  const { data, error } = await supabase.from('entites').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateEntite(id: string, patch: EntiteUpdate): Promise<Entite> {
  const { data, error } = await supabase
    .from('entites')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntite(id: string): Promise<void> {
  const { error } = await supabase.from('entites').delete().eq('id', id);
  if (error) throw error;
}

export interface UtilisateurOption {
  id: string;
  nom: string;
  prenom: string;
}

// Sélecteur léger réutilisé par le formulaire d'entité (responsable) et par les
// autres volets (attribution de rôles, etc.) — évite de dépendre du chargement
// complet de l'onglet Utilisateurs.
export async function listUtilisateursOptions(organisationId: string): Promise<UtilisateurOption[]> {
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('id, nom, prenom')
    .eq('organisation_id', organisationId)
    .order('nom', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
