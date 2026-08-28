import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type Destinataire = Database['public']['Tables']['courrier_destinataires']['Row'];
export type DestinataireInsert = Database['public']['Tables']['courrier_destinataires']['Insert'];

export async function listDestinataires(courrierId: string): Promise<Destinataire[]> {
  const { data, error } = await supabase
    .from('courrier_destinataires')
    .select('*')
    .eq('courrier_id', courrierId);
  if (error) throw error;
  return data ?? [];
}

export async function ajouterDestinataire(insert: DestinataireInsert): Promise<Destinataire> {
  const { data, error } = await supabase
    .from('courrier_destinataires')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function retirerDestinataire(id: string): Promise<void> {
  const { error } = await supabase.from('courrier_destinataires').delete().eq('id', id);
  if (error) throw error;
}

export async function marquerPriseConnaissance(id: string): Promise<Destinataire> {
  const { data, error } = await supabase
    .from('courrier_destinataires')
    .update({ date_prise_connaissance: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Actions demandées cochées pour un destinataire donné (fiche d'exploitation
// arrivée) — requête directe par courrier_destinataire_id, distincte de
// listHistoriqueActions (services/courrier/workflow.ts) qui ne couvre que les
// lignes déjà corrélées à une transition (workflow_historique_id).
export async function listActionsDemandeesDestinataire(destinataireId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('courrier_destinataire_actions')
    .select('valeur_liste_id')
    .eq('courrier_destinataire_id', destinataireId);
  if (error) throw error;
  return (data ?? []).map((a) => a.valeur_liste_id);
}
