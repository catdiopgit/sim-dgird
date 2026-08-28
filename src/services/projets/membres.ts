import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type ProjetMembre = Database['public']['Tables']['projet_membres']['Row'];
export type ProjetMembreInsert = Database['public']['Tables']['projet_membres']['Insert'];

// Liste uniquement les membres actifs (date_retrait is null) — un retrait ne
// supprime jamais la ligne, il pose date_retrait, pour garder l'historique
// (cf. l'index unique partiel du schéma sur (projet_id, utilisateur_id) where
// date_retrait is null).
export async function listMembresActifs(projetId: string): Promise<ProjetMembre[]> {
  const { data, error } = await supabase
    .from('projet_membres')
    .select('*')
    .eq('projet_id', projetId)
    .is('date_retrait', null)
    .order('date_ajout', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function ajouterMembre(insert: ProjetMembreInsert): Promise<ProjetMembre> {
  const { data, error } = await supabase.from('projet_membres').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function retirerMembre(id: string): Promise<void> {
  const { error } = await supabase
    .from('projet_membres')
    .update({ date_retrait: new Date().toISOString().slice(0, 10) })
    .eq('id', id);
  if (error) throw error;
}
