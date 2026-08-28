import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import type { Database } from '../../types/database';

export type Livrable = Database['public']['Tables']['livrables']['Row'];
export type LivrableInsert = Database['public']['Tables']['livrables']['Insert'];
export type LivrableUpdate = Database['public']['Tables']['livrables']['Update'];

// §3 Règle obligatoire : seule voie pour passer un livrable à "réalisé"/
// "validé" — fn_cloturer_livrable vérifie côté serveur qu'au moins un
// document justificatif est associé.
export async function cloturerLivrable(livrableId: string, statutCode: 'realise' | 'valide' = 'realise'): Promise<Livrable> {
  return callRpc<Livrable>('fn_cloturer_livrable', { p_livrable_id: livrableId, p_statut_code: statutCode });
}

export async function listLivrables(projetId: string): Promise<Livrable[]> {
  const { data, error } = await supabase
    .from('livrables')
    .select('*')
    .eq('projet_id', projetId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createLivrable(insert: LivrableInsert): Promise<Livrable> {
  const { data, error } = await supabase.from('livrables').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateLivrable(id: string, patch: LivrableUpdate): Promise<Livrable> {
  const { data, error } = await supabase.from('livrables').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteLivrable(id: string): Promise<void> {
  const { error } = await supabase.from('livrables').delete().eq('id', id);
  if (error) throw error;
}
