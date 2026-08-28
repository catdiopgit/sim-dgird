import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type MissionParticipant = Database['public']['Tables']['mission_participants']['Row'];
export type MissionParticipantInsert = Database['public']['Tables']['mission_participants']['Insert'];

export async function listParticipants(missionId: string): Promise<MissionParticipant[]> {
  const { data, error } = await supabase.from('mission_participants').select('*').eq('mission_id', missionId);
  if (error) throw error;
  return data ?? [];
}

export async function ajouterParticipant(insert: MissionParticipantInsert): Promise<MissionParticipant> {
  const { data, error } = await supabase.from('mission_participants').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function retirerParticipant(id: string): Promise<void> {
  const { error } = await supabase.from('mission_participants').delete().eq('id', id);
  if (error) throw error;
}
