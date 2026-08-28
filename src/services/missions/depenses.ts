import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';
import { ajouterDocumentMissionAvecFichier } from './documents';

export type MissionDepense = Database['public']['Tables']['mission_depenses']['Row'];
export type MissionDepenseInsert = Database['public']['Tables']['mission_depenses']['Insert'];

export async function listDepenses(missionId: string): Promise<MissionDepense[]> {
  const { data, error } = await supabase
    .from('mission_depenses')
    .select('*')
    .eq('mission_id', missionId)
    .order('date_depense', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Le justificatif est obligatoire : la ligne mission_depenses est créée
// d'abord (pour obtenir son id), puis le document est déposé et rattaché via
// fn_ajouter_document_mission (p_role: 'depense', p_depense_id) — même
// séquence à deux étapes que creerDecaissementAvecJustificatif (Projets),
// avec le même rollback si l'upload échoue.
export async function creerDepenseAvecJustificatif(
  insert: MissionDepenseInsert,
  fichier: File,
  titreDocument: string,
): Promise<MissionDepense> {
  const { data: depense, error } = await supabase.from('mission_depenses').insert(insert).select('*').single();
  if (error) throw error;

  try {
    await ajouterDocumentMissionAvecFichier(
      { p_mission_id: depense.mission_id, p_titre: titreDocument, p_role: 'depense', p_depense_id: depense.id },
      fichier,
    );
  } catch (uploadError) {
    await supabase.from('mission_depenses').delete().eq('id', depense.id);
    throw uploadError;
  }

  return depense;
}

export async function supprimerDepense(id: string): Promise<void> {
  const { error } = await supabase.from('mission_depenses').delete().eq('id', id);
  if (error) throw error;
}
