import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import type { Database } from '../../types/database';

export type GedVersement = Database['public']['Tables']['ged_versements']['Row'];

export async function listMesBrouillons(organisationId: string): Promise<GedVersement[]> {
  const { data, error } = await supabase
    .from('ged_versements')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('brouillon', true)
    .is('supprime_le', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listVersements(organisationId: string): Promise<GedVersement[]> {
  const { data, error } = await supabase
    .from('ged_versements')
    .select('*')
    .eq('organisation_id', organisationId)
    .is('supprime_le', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getVersement(id: string): Promise<GedVersement> {
  const { data, error } = await supabase.from('ged_versements').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export interface CreerVersementPayload {
  p_objet: string;
  p_entite_id?: string | null;
  p_dossier_cible_id?: string | null;
  p_description?: string | null;
}

export async function creerVersement(payload: CreerVersementPayload): Promise<GedVersement> {
  return callRpc<GedVersement>('fn_creer_versement', { ...payload });
}

export async function soumettreVersement(versementId: string): Promise<GedVersement> {
  return callRpc<GedVersement>('fn_soumettre_versement', { p_versement_id: versementId });
}

export interface ModifierVersementPayload {
  objet?: string;
  description?: string | null;
  entite_id?: string | null;
  dossier_cible_id?: string | null;
}

// Édition directe du brouillon par son rédacteur (ged_versements_write, 0057).
export async function modifierVersement(id: string, payload: ModifierVersementPayload): Promise<GedVersement> {
  const { data, error } = await supabase.from('ged_versements').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
