import { supabase } from '../../config/supabase';
import type { ValeurListe } from '../administration/parametrage';

// Liste partagée entre Courrier et GED (listes_valeurs.module_id null, cf.
// commentaire dans 0007_parametrage_generique.sql) — rien à dupliquer.
const CODE_CONFIDENTIALITE = 'courrier_confidentialite';

export async function fetchConfidentialitesGed(organisationId: string): Promise<ValeurListe[]> {
  const { data: liste, error: listeError } = await supabase
    .from('listes_valeurs')
    .select('id')
    .eq('organisation_id', organisationId)
    .eq('code', CODE_CONFIDENTIALITE)
    .maybeSingle();
  if (listeError) throw listeError;
  if (!liste) return [];

  const { data, error } = await supabase
    .from('valeurs_listes')
    .select('*')
    .eq('liste_id', liste.id)
    .eq('actif', true)
    .order('ordre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
