import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import type { Database } from '../../types/database';

// mot_de_passe volontairement absent : privilège colonne retiré pour
// authenticated/anon (migration 0052) — jamais lisible depuis le client,
// seule fn_definir_parametres_smtp peut l'écrire.
export type ParametresSmtp = Database['public']['Tables']['parametres_smtp']['Row'];

export async function fetchParametresSmtp(organisationId: string): Promise<ParametresSmtp | null> {
  const { data, error } = await supabase
    .from('parametres_smtp')
    .select('id, organisation_id, hote, port, securite, utilisateur, adresse_expediteur, nom_expediteur, actif, updated_at, updated_by')
    .eq('organisation_id', organisationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface DefinirParametresSmtpPayload {
  p_hote: string;
  p_port: number;
  p_securite: 'none' | 'tls' | 'ssl';
  p_utilisateur: string;
  // Vide/absent = conserver le mot de passe déjà enregistré (cf.
  // fn_definir_parametres_smtp, migration 0052).
  p_mot_de_passe?: string | null;
  p_adresse_expediteur: string;
  p_nom_expediteur?: string | null;
  p_actif: boolean;
}

export async function definirParametresSmtp(payload: DefinirParametresSmtpPayload): Promise<void> {
  await callRpc<null>('fn_definir_parametres_smtp', { ...payload });
}
