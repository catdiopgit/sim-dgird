import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import type { Database } from '../../types/database';

export type Mission = Database['public']['Tables']['missions']['Row'];
export type MissionInsert = Database['public']['Tables']['missions']['Insert'];
export type MissionUpdate = Database['public']['Tables']['missions']['Update'];

export async function listMissions(organisationId: string): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('date_depart', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMission(id: string): Promise<Mission> {
  const { data, error } = await supabase.from('missions').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export interface CreerMissionInput {
  entite_id: string;
  objet: string;
  responsable_id: string | null;
  lieu: string | null;
  date_depart: string;
  date_retour: string;
  objectifs: string | null;
  activites_prevues: string | null;
  budget_prevu: number | null;
}

// La numérotation (app.fn_generer_numero) et le démarrage du workflow
// (app.fn_demarrer_workflow) ne sont accordés qu'à des wrappers publics
// SECURITY DEFINER (jamais appelés directement depuis le client, voir
// fn_soumettre_versement en GED) — fn_creer_mission (0077) bundle les deux
// avec l'insertion en une seule transaction.
export async function creerMission(input: CreerMissionInput): Promise<Mission> {
  return callRpc<Mission>('fn_creer_mission', {
    p_entite_id: input.entite_id,
    p_objet: input.objet,
    p_date_depart: input.date_depart,
    p_date_retour: input.date_retour,
    p_responsable_id: input.responsable_id,
    p_lieu: input.lieu,
    p_objectifs: input.objectifs,
    p_activites_prevues: input.activites_prevues,
    p_budget_prevu: input.budget_prevu,
  });
}

export async function updateMission(id: string, patch: MissionUpdate): Promise<Mission> {
  const { data, error } = await supabase.from('missions').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteMission(id: string): Promise<void> {
  const { error } = await supabase.from('missions').delete().eq('id', id);
  if (error) throw error;
}
