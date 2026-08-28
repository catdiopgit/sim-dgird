import { supabase } from '../../config/supabase';
import type { Database, Json } from '../../types/database';

export type ListeValeurs = Database['public']['Tables']['listes_valeurs']['Row'];
export type ListeValeursInsert = Database['public']['Tables']['listes_valeurs']['Insert'];
export type ListeValeursUpdate = Database['public']['Tables']['listes_valeurs']['Update'];
export type ValeurListe = Database['public']['Tables']['valeurs_listes']['Row'];
export type ValeurListeInsert = Database['public']['Tables']['valeurs_listes']['Insert'];
export type ValeurListeUpdate = Database['public']['Tables']['valeurs_listes']['Update'];
export type RegleNumerotation = Database['public']['Tables']['regles_numerotation']['Row'];
export type RegleNumerotationInsert = Database['public']['Tables']['regles_numerotation']['Insert'];
export type RegleNumerotationUpdate = Database['public']['Tables']['regles_numerotation']['Update'];
export type ParametreOrganisation = Database['public']['Tables']['parametres_organisation']['Row'];

// --- Listes de valeurs (référentiel générique) ---

export async function listListesValeurs(organisationId: string): Promise<ListeValeurs[]> {
  const { data, error } = await supabase
    .from('listes_valeurs')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('libelle', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createListeValeurs(insert: ListeValeursInsert): Promise<ListeValeurs> {
  const { data, error } = await supabase.from('listes_valeurs').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateListeValeurs(id: string, patch: ListeValeursUpdate): Promise<ListeValeurs> {
  const { data, error } = await supabase
    .from('listes_valeurs')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteListeValeurs(id: string): Promise<void> {
  const { error } = await supabase.from('listes_valeurs').delete().eq('id', id);
  if (error) throw error;
}

export async function listValeursListes(listeId: string): Promise<ValeurListe[]> {
  const { data, error } = await supabase
    .from('valeurs_listes')
    .select('*')
    .eq('liste_id', listeId)
    .order('ordre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createValeurListe(insert: ValeurListeInsert): Promise<ValeurListe> {
  const { data, error } = await supabase.from('valeurs_listes').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateValeurListe(id: string, patch: ValeurListeUpdate): Promise<ValeurListe> {
  const { data, error } = await supabase
    .from('valeurs_listes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteValeurListe(id: string): Promise<void> {
  const { error } = await supabase.from('valeurs_listes').delete().eq('id', id);
  if (error) throw error;
}

// --- Règles de numérotation ---

export async function listReglesNumerotation(organisationId: string): Promise<RegleNumerotation[]> {
  const { data, error } = await supabase
    .from('regles_numerotation')
    .select('*')
    .eq('organisation_id', organisationId);
  if (error) throw error;
  return data ?? [];
}

export async function createRegleNumerotation(
  insert: RegleNumerotationInsert,
): Promise<RegleNumerotation> {
  const { data, error } = await supabase.from('regles_numerotation').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateRegleNumerotation(
  id: string,
  patch: RegleNumerotationUpdate,
): Promise<RegleNumerotation> {
  const { data, error } = await supabase
    .from('regles_numerotation')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRegleNumerotation(id: string): Promise<void> {
  const { error } = await supabase.from('regles_numerotation').delete().eq('id', id);
  if (error) throw error;
}

// --- Paramètres organisation (clé/valeur) ---

export async function listParametresOrganisation(organisationId: string): Promise<ParametreOrganisation[]> {
  const { data, error } = await supabase
    .from('parametres_organisation')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('cle', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertParametreOrganisation(
  organisationId: string,
  cle: string,
  valeur: Json,
  description: string | null,
): Promise<ParametreOrganisation> {
  const { data, error } = await supabase
    .from('parametres_organisation')
    .upsert(
      { organisation_id: organisationId, cle, valeur, description },
      { onConflict: 'organisation_id,cle' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteParametreOrganisation(id: string): Promise<void> {
  const { error } = await supabase.from('parametres_organisation').delete().eq('id', id);
  if (error) throw error;
}
