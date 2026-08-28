import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type MissionActionSuivi = Database['public']['Tables']['mission_actions_suivi']['Row'];
export type MissionActionSuiviInsert = Database['public']['Tables']['mission_actions_suivi']['Insert'];
export type MissionActionSuiviUpdate = Database['public']['Tables']['mission_actions_suivi']['Update'];

export async function listActionsSuivi(missionId: string): Promise<MissionActionSuivi[]> {
  const { data, error } = await supabase
    .from('mission_actions_suivi')
    .select('*')
    .eq('mission_id', missionId)
    .order('date_echeance', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function creerActionSuivi(insert: MissionActionSuiviInsert): Promise<MissionActionSuivi> {
  const { data, error } = await supabase.from('mission_actions_suivi').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateActionSuivi(id: string, patch: MissionActionSuiviUpdate): Promise<MissionActionSuivi> {
  const { data, error } = await supabase.from('mission_actions_suivi').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function supprimerActionSuivi(id: string): Promise<void> {
  const { error } = await supabase.from('mission_actions_suivi').delete().eq('id', id);
  if (error) throw error;
}
