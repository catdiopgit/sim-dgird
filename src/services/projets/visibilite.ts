import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type ProjetVisibiliteEntite = Database['public']['Tables']['projet_visibilite_entites']['Row'];
export type ProjetVisibiliteUtilisateur = Database['public']['Tables']['projet_visibilite_utilisateurs']['Row'];

export async function listVisibiliteEntites(projetId: string): Promise<ProjetVisibiliteEntite[]> {
  const { data, error } = await supabase.from('projet_visibilite_entites').select('*').eq('projet_id', projetId);
  if (error) throw error;
  return data ?? [];
}

export async function listVisibiliteUtilisateurs(projetId: string): Promise<ProjetVisibiliteUtilisateur[]> {
  const { data, error } = await supabase.from('projet_visibilite_utilisateurs').select('*').eq('projet_id', projetId);
  if (error) throw error;
  return data ?? [];
}

// Remplace l'ensemble de la sélection (entités ou agents autorisés) en une
// fois : plus simple côté UI (un Select multiple) qu'un diff ajout/retrait.
export async function definirVisibiliteEntites(projetId: string, entiteIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase.from('projet_visibilite_entites').delete().eq('projet_id', projetId);
  if (deleteError) throw deleteError;
  if (entiteIds.length === 0) return;
  const { error } = await supabase
    .from('projet_visibilite_entites')
    .insert(entiteIds.map((entite_id) => ({ projet_id: projetId, entite_id })));
  if (error) throw error;
}

export async function definirVisibiliteUtilisateurs(projetId: string, utilisateurIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('projet_visibilite_utilisateurs')
    .delete()
    .eq('projet_id', projetId);
  if (deleteError) throw deleteError;
  if (utilisateurIds.length === 0) return;
  const { error } = await supabase
    .from('projet_visibilite_utilisateurs')
    .insert(utilisateurIds.map((utilisateur_id) => ({ projet_id: projetId, utilisateur_id })));
  if (error) throw error;
}
