import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type GedDossier = Database['public']['Tables']['ged_dossiers']['Row'];

// Le plan de classement EST l'arbre des dossiers (parent_dossier_id, déjà
// hiérarchique) — pas une notion de "catégorie" séparée.
export async function listDossiers(organisationId: string): Promise<GedDossier[]> {
  const data = await api.get<unknown[]>('/ged/dossiers', { organisationId });
  return toSnakeCase<GedDossier[]>(data);
}

export interface CreerDossierPayload {
  p_libelle: string;
  p_code: string;
  p_entite_id?: string | null;
  p_parent_dossier_id?: string | null;
  p_description?: string | null;
}

export async function creerDossierGed(payload: CreerDossierPayload): Promise<GedDossier> {
  const data = await api.post<unknown>('/ged/dossiers', {
    code: payload.p_code,
    libelle: payload.p_libelle,
    entiteId: payload.p_entite_id ?? null,
    parentDossierId: payload.p_parent_dossier_id ?? null,
    description: payload.p_description ?? null,
  });
  return toSnakeCase<GedDossier>(data);
}

export interface ModifierDossierPayload {
  p_dossier_id: string;
  p_libelle?: string | null;
  p_description?: string | null;
  p_parent_dossier_id?: string | null;
  p_deplacer?: boolean;
}

export async function modifierDossierGed(payload: ModifierDossierPayload): Promise<GedDossier> {
  const data = await api.patch<unknown>(`/ged/dossiers/${payload.p_dossier_id}`, {
    libelle: payload.p_libelle ?? undefined,
    description: payload.p_description ?? undefined,
    parentDossierId: payload.p_parent_dossier_id ?? undefined,
    deplacer: payload.p_deplacer ?? undefined,
  });
  return toSnakeCase<GedDossier>(data);
}

export interface CompteurDossier {
  dossier_id: string | null;
  nb: number;
}

// Nombre de documents archivés par dossier (dossier_id null = "Non classés")
// — alimente les badges de comptage de l'explorateur Archives.
export async function compterDocumentsParDossier(): Promise<CompteurDossier[]> {
  return api.get<CompteurDossier[]>('/ged/recherche/comptage-par-dossier');
}
