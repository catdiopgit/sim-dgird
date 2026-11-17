import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

// v8.6 : le serveur ajoute à chaque dossier son nombre de documents, l'état
// « verrouillé » (des documents sont classés dans le dossier ou dans un de ses
// sous-dossiers : code figé, déplacement et suppression impossibles) et ses
// entités productrices.
export type GedDossier = Database['public']['Tables']['ged_dossiers']['Row'] & {
  nb_documents?: number;
  verrouille?: boolean;
  entites_productrices?: string[];
};

// Le plan de classement EST l'arbre des dossiers (parent_dossier_id).
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
  p_ordre?: number | null;
}

export async function creerDossierGed(payload: CreerDossierPayload): Promise<GedDossier> {
  const data = await api.post<unknown>('/ged/dossiers', {
    code: payload.p_code,
    libelle: payload.p_libelle,
    entiteId: payload.p_entite_id ?? null,
    parentDossierId: payload.p_parent_dossier_id ?? null,
    description: payload.p_description ?? null,
    ordre: payload.p_ordre ?? undefined,
  });
  return toSnakeCase<GedDossier>(data);
}

export interface ModifierDossierPayload {
  p_dossier_id: string;
  p_code?: string | null;
  p_libelle?: string | null;
  p_description?: string | null;
  p_ordre?: number | null;
  p_actif?: boolean;
  p_parent_dossier_id?: string | null;
  p_deplacer?: boolean;
}

export async function modifierDossierGed(payload: ModifierDossierPayload): Promise<GedDossier> {
  const data = await api.patch<unknown>(`/ged/dossiers/${payload.p_dossier_id}`, {
    code: payload.p_code ?? undefined,
    libelle: payload.p_libelle ?? undefined,
    description: payload.p_description ?? undefined,
    ordre: payload.p_ordre ?? undefined,
    actif: payload.p_actif ?? undefined,
    parentDossierId: payload.p_deplacer ? (payload.p_parent_dossier_id ?? null) : undefined,
    deplacer: payload.p_deplacer ?? undefined,
  });
  return toSnakeCase<GedDossier>(data);
}

export async function supprimerDossierGed(id: string): Promise<void> {
  await api.delete(`/ged/dossiers/${id}`);
}

export async function definirEntitesProductrices(id: string, entiteIds: string[]): Promise<string[]> {
  return api.put<string[]>(`/ged/dossiers/${id}/entites-productrices`, { entiteIds });
}

export async function importerPlanDirectionRoutes(): Promise<{ nbDossiers: number }> {
  return api.post<{ nbDossiers: number }>('/ged/dossiers/importer-plan-direction-routes', {});
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

// Tri officiel du plan : ordre d'affichage, puis code.
export function comparerDossiers(a: GedDossier, b: GedDossier): number {
  return (a.ordre ?? 0) - (b.ordre ?? 0) || a.code.localeCompare(b.code, 'fr', { numeric: true });
}

// Libellé affiché partout : « CODE — Intitulé ».
export function libelleDossier(d: Pick<GedDossier, 'code' | 'libelle'>): string {
  return `${d.code} — ${d.libelle}`;
}
