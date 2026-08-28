import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type ContactExecution = Database['public']['Tables']['projet_contacts_execution']['Row'];
export type ContactExecutionInsert = Database['public']['Tables']['projet_contacts_execution']['Insert'];

// §4 Personnes de l'organisme chargé d'exécuter le projet (consultant,
// entreprise...) sans compte SIM — sert de vivier pour le "responsable" d'un
// livrable et le "chargé de l'exécution" du projet, en plus des membres.
export async function listContactsExecution(projetId: string): Promise<ContactExecution[]> {
  const { data, error } = await supabase
    .from('projet_contacts_execution')
    .select('*')
    .eq('projet_id', projetId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function ajouterContactExecution(insert: ContactExecutionInsert): Promise<ContactExecution> {
  const { data, error } = await supabase.from('projet_contacts_execution').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function supprimerContactExecution(id: string): Promise<void> {
  const { error } = await supabase.from('projet_contacts_execution').delete().eq('id', id);
  if (error) throw error;
}
