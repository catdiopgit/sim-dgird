import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type Projet = Database['public']['Tables']['projets']['Row'];
export type ProjetInsert = Database['public']['Tables']['projets']['Insert'];
export type ProjetUpdate = Database['public']['Tables']['projets']['Update'];

export async function listProjets(organisationId: string): Promise<Projet[]> {
  const { data, error } = await supabase
    .from('projets')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProjet(id: string): Promise<Projet> {
  const { data, error } = await supabase.from('projets').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

// Pas de .select() enchaîné après l'insert : la policy SELECT (projets_select)
// s'appuie sur app.can_view_projet(id), qui relit la ligne elle-même — pour un
// INSERT ... RETURNING, Postgres réévalue cette policy SELECT sur la ligne tout
// juste insérée dans la même commande, ce qui échoue systématiquement pour cette
// table auto-référentielle (erreur RLS malgré un WITH CHECK qui passe). On génère
// donc l'id côté client et on relit la ligne dans un aller-retour séparé.
export async function createProjet(insert: ProjetInsert): Promise<Projet> {
  const id = insert.id ?? crypto.randomUUID();
  const { error } = await supabase.from('projets').insert({ ...insert, id });
  if (error) throw error;
  return getProjet(id);
}

export async function updateProjet(id: string, patch: ProjetUpdate): Promise<Projet> {
  const { data, error } = await supabase.from('projets').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteProjet(id: string): Promise<void> {
  const { error } = await supabase.from('projets').delete().eq('id', id);
  if (error) throw error;
}
