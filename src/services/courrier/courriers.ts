import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import type { Database } from '../../types/database';

export type Courrier = Database['public']['Tables']['courriers']['Row'];
export type CourrierUpdate = Database['public']['Tables']['courriers']['Update'];
export type SensCourrier = Database['public']['Enums']['sens_courrier'];

export interface CourrierFiltres {
  sens?: SensCourrier;
  recherche?: string;
}

export async function listCourriers(
  organisationId: string,
  filtres: CourrierFiltres = {},
): Promise<Courrier[]> {
  let query = supabase
    .from('courriers')
    .select('*')
    .eq('organisation_id', organisationId)
    .is('supprime_le', null)
    .order('created_at', { ascending: false });

  if (filtres.sens) query = query.eq('sens', filtres.sens);
  if (filtres.recherche) query = query.ilike('objet', `%${filtres.recherche}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCourrier(id: string): Promise<Courrier> {
  const { data, error } = await supabase.from('courriers').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

// Champs informatifs seulement: sens/numero/workflow_instance_id/etape_* sont
// gérés par fn_creer_courrier / fn_executer_transition_courrier, jamais en écriture directe.
export type CourrierPatchInfos = Pick<
  CourrierUpdate,
  | 'objet'
  | 'type_valeur_id'
  | 'priorite_valeur_id'
  | 'confidentialite_valeur_id'
  | 'mode_transmission_valeur_id'
  | 'date_courrier'
  | 'date_reception'
  | 'date_envoi'
  | 'expediteur_nom'
  | 'expediteur_type_valeur_id'
  | 'destinataire_texte'
  | 'entite_destinataire_id'
  | 'agent_destinataire_id'
  | 'observations'
>;

export async function updateCourrier(id: string, patch: CourrierPatchInfos): Promise<Courrier> {
  const { data, error } = await supabase
    .from('courriers')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Suppression douce (colonne supprime_le) plutôt que DELETE dur: cohérent avec
// le même patron déjà utilisé sur documents/ged_dossiers.
export async function supprimerCourrier(id: string): Promise<void> {
  const { error } = await supabase
    .from('courriers')
    .update({ supprime_le: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export interface CreerCourrierPayload {
  p_sens: SensCourrier;
  p_objet: string;
  // Optionnel: pour un courrier arrivé, laisser vide pour laisser le routage
  // initial (paramètre d'organisation) déterminer l'entité automatiquement —
  // cf. app.fn_parametre_organisation / clé 'courrier.entite_destinataire_initiale_id'.
  p_entite_id?: string | null;
  p_type_valeur_id?: string | null;
  p_priorite_valeur_id?: string | null;
  p_confidentialite_valeur_id?: string | null;
  p_mode_transmission_valeur_id?: string | null;
  p_date_courrier?: string | null;
  p_date_reception?: string | null;
  p_date_envoi?: string | null;
  p_expediteur_nom?: string | null;
  p_expediteur_type_valeur_id?: string | null;
  p_destinataire_texte?: string | null;
  p_entite_destinataire_id?: string | null;
  p_agent_destinataire_id?: string | null;
  p_contact_destinataire_id?: string | null;
  p_statut_reception_valeur_id?: string | null;
  p_expediteur_contact_id?: string | null;
  p_reference_expediteur?: string | null;
  p_observations?: string | null;
}

export async function creerCourrier(payload: CreerCourrierPayload): Promise<Courrier> {
  return callRpc<Courrier>('fn_creer_courrier', { ...payload });
}

export type Bannette = 'a_traiter' | 'en_retard' | 'archives' | 'sortants' | 'en_copie' | 'clotures';

// Architecture bannettes (plan V3 §H) : une fonction serveur unique par
// bannette, réutilisant les briques du moteur de workflow (acteur autorisé,
// délais, étapes finales) plutôt que des filtres client.
export async function listBannetteCourriers(bannette: Bannette): Promise<Courrier[]> {
  return callRpc<Courrier[]>('fn_bannettes_courrier', { p_bannette: bannette });
}
