import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';
import { ajouterDocumentProjetAvecFichier } from './documents';

export type Decaissement = Database['public']['Tables']['decaissements']['Row'];
export type DecaissementInsert = Database['public']['Tables']['decaissements']['Insert'];
export type DecaissementUpdate = Database['public']['Tables']['decaissements']['Update'];

export async function listDecaissements(projetId: string): Promise<Decaissement[]> {
  const { data, error } = await supabase
    .from('decaissements')
    .select('*')
    .eq('projet_id', projetId)
    .order('date_decaissement', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// §5 Le justificatif est obligatoire : la ligne decaissements est créée
// d'abord (pour obtenir son id), puis le document est déposé et rattaché via
// fn_ajouter_document_projet (p_decaissement_id) — même séquence à deux
// étapes que ajouterDocumentProjetAvecFichier, avec le même rollback si
// l'upload échoue.
export async function creerDecaissementAvecJustificatif(
  insert: DecaissementInsert,
  fichier: File,
  titreDocument: string,
): Promise<Decaissement> {
  const { data: decaissement, error } = await supabase.from('decaissements').insert(insert).select('*').single();
  if (error) throw error;

  try {
    await ajouterDocumentProjetAvecFichier(
      { p_projet_id: decaissement.projet_id, p_titre: titreDocument, p_decaissement_id: decaissement.id },
      fichier,
    );
  } catch (uploadError) {
    await supabase.from('decaissements').delete().eq('id', decaissement.id);
    throw uploadError;
  }

  return decaissement;
}

export async function updateDecaissement(id: string, patch: DecaissementUpdate): Promise<Decaissement> {
  const { data, error } = await supabase.from('decaissements').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteDecaissement(id: string): Promise<void> {
  const { error } = await supabase.from('decaissements').delete().eq('id', id);
  if (error) throw error;
}
