import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import type { Database } from '../../types/database';

export type GedDossier = Database['public']['Tables']['ged_dossiers']['Row'];

// Le plan de classement EST l'arbre des dossiers (parent_dossier_id, déjà
// hiérarchique) — pas une notion de "catégorie" séparée. Voir
// PlanClassementManager.tsx (administration) et ClassementPanel.tsx (GED).
export async function listDossiers(organisationId: string): Promise<GedDossier[]> {
  const { data, error } = await supabase
    .from('ged_dossiers')
    .select('*')
    .eq('organisation_id', organisationId)
    .is('supprime_le', null)
    .order('chemin', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface CreerDossierPayload {
  p_libelle: string;
  p_code: string;
  p_entite_id?: string | null;
  p_parent_dossier_id?: string | null;
  p_description?: string | null;
}

export async function creerDossierGed(payload: CreerDossierPayload): Promise<GedDossier> {
  return callRpc<GedDossier>('fn_creer_dossier_ged', { ...payload });
}

export interface ModifierDossierPayload {
  p_dossier_id: string;
  p_libelle?: string | null;
  p_description?: string | null;
  p_parent_dossier_id?: string | null;
  p_deplacer?: boolean;
}

export async function modifierDossierGed(payload: ModifierDossierPayload): Promise<GedDossier> {
  return callRpc<GedDossier>('fn_modifier_dossier_ged', { ...payload });
}

export interface CompteurDossier {
  dossier_id: string | null;
  nb: number;
}

// Nombre de documents archivés par dossier (dossier_id null = "Non classés")
// — alimente les badges de comptage de l'explorateur Archives.
export async function compterDocumentsParDossier(): Promise<CompteurDossier[]> {
  return callRpc<CompteurDossier[]>('fn_compter_documents_par_dossier', {});
}
