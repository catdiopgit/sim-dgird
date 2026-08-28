import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type Contact = Database['public']['Tables']['contacts']['Row'];
export type ContactType = 'personne' | 'entreprise' | 'administration';

export interface ContactInsert {
  organisation_id: string;
  nom: string;
  type?: ContactType;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
}

export async function listContacts(organisationId: string, recherche?: string): Promise<Contact[]> {
  let query = supabase
    .from('contacts')
    .select('*')
    .eq('organisation_id', organisationId)
    .is('supprime_le', null)
    .order('nom', { ascending: true });

  if (recherche) query = query.ilike('nom', `%${recherche}%`);

  const { data, error } = await query.limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function creerContact(insert: ContactInsert): Promise<Contact> {
  const { data, error } = await supabase.from('contacts').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}
