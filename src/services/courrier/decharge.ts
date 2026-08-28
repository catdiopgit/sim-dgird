import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import type { Courrier } from './courriers';

const BUCKET = 'courrier-pieces-jointes';

// Décharge = pièce justificative de dépôt (plan V4 §9) : réutilise le bucket/
// la table des pièces jointes existants (est_decharge, même patron que
// est_scan) plutôt qu'un nouveau mécanisme. Verrouille le courrier dans la
// même transaction côté serveur (public.fn_ajouter_decharge_courrier, 0036).
export async function ajouterDechargeCourrier(courrierId: string, file: File): Promise<Courrier> {
  const chemin = `${courrierId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(chemin, file);
  if (uploadError) throw uploadError;

  try {
    return await callRpc<Courrier>('fn_ajouter_decharge_courrier', {
      p_courrier_id: courrierId,
      p_storage_path: chemin,
      p_nom_fichier: file.name,
      p_taille_octets: file.size,
      p_type_mime: file.type || null,
    });
  } catch (err) {
    // Évite un fichier orphelin en Storage si le verrouillage échoue.
    await supabase.storage.from(BUCKET).remove([chemin]);
    throw err;
  }
}

// Procédure exceptionnelle: motif obligatoire, journalisée explicitement côté
// serveur (jamais une levée de verrou silencieuse — plan V4 §10/§11).
export async function deverrouillerCourrier(courrierId: string, motif: string): Promise<Courrier> {
  return callRpc<Courrier>('fn_deverrouiller_courrier', { p_courrier_id: courrierId, p_motif: motif });
}
