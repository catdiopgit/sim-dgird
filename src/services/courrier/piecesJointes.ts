import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type PieceJointe = Database['public']['Tables']['courrier_pieces_jointes']['Row'];

const BUCKET = 'courrier-pieces-jointes';

export async function listPiecesJointes(courrierId: string): Promise<PieceJointe[]> {
  const { data, error } = await supabase
    .from('courrier_pieces_jointes')
    .select('*')
    .eq('courrier_id', courrierId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadPieceJointe(
  courrierId: string,
  file: File,
  estScan: boolean,
): Promise<PieceJointe> {
  // Convention de chemin attendue par les policies storage.objects de la
  // migration 0019: premier segment = courrier_id.
  const chemin = `${courrierId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(chemin, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('courrier_pieces_jointes')
    .insert({
      courrier_id: courrierId,
      storage_path: chemin,
      nom_fichier: file.name,
      taille_octets: file.size,
      type_mime: file.type || null,
      est_scan: estScan,
    })
    .select('*')
    .single();
  if (error) {
    // Évite un fichier orphelin en Storage si l'insertion des métadonnées échoue.
    await supabase.storage.from(BUCKET).remove([chemin]);
    throw error;
  }
  return data;
}

export async function supprimerPieceJointe(id: string, storagePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('courrier_pieces_jointes').delete().eq('id', id);
  if (error) throw error;
}

export async function getUrlSignee(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}
