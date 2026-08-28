import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type Delegation = Database['public']['Tables']['delegations']['Row'];
export type DelegationInsert = Database['public']['Tables']['delegations']['Insert'];

// Pas de colonne organisation_id (comme utilisateur_roles) : la policy RLS
// delegations_select fait déjà le filtrage (délégant/délégataire soi-même, ou
// admin de la même organisation que le délégant).
export async function listDelegations(): Promise<Delegation[]> {
  const { data, error } = await supabase
    .from('delegations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function creerDelegation(insert: DelegationInsert): Promise<Delegation> {
  const { data, error } = await supabase.from('delegations').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

// Révocation = désactivation (traçable via journal_audit) plutôt que suppression.
export async function revoquerDelegation(id: string): Promise<Delegation> {
  const { data, error } = await supabase
    .from('delegations')
    .update({ actif: false, date_fin: new Date().toISOString().slice(0, 10) })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
