import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type GedVersement = Database['public']['Tables']['ged_versements']['Row'];

// organisationId n'est pas transmis : le backend le déduit de l'utilisateur
// courant (JWT) — voir server/ged/ged-versements.controller.ts.
export async function listMesBrouillons(_organisationId: string): Promise<GedVersement[]> {
  const data = await api.get<unknown[]>('/ged/versements', { brouillons: true });
  return toSnakeCase<GedVersement[]>(data);
}

export async function listVersements(_organisationId: string): Promise<GedVersement[]> {
  const data = await api.get<unknown[]>('/ged/versements');
  return toSnakeCase<GedVersement[]>(data);
}

export async function getVersement(id: string): Promise<GedVersement> {
  const data = await api.get<unknown>(`/ged/versements/${id}`);
  return toSnakeCase<GedVersement>(data);
}

export interface CreerVersementPayload {
  p_objet: string;
  p_entite_id?: string | null;
  p_dossier_cible_id?: string | null;
  p_description?: string | null;
}

export async function creerVersement(payload: CreerVersementPayload): Promise<GedVersement> {
  const data = await api.post<unknown>('/ged/versements', {
    objet: payload.p_objet,
    entiteId: payload.p_entite_id ?? null,
    dossierCibleId: payload.p_dossier_cible_id ?? null,
    description: payload.p_description ?? null,
  });
  return toSnakeCase<GedVersement>(data);
}

export async function soumettreVersement(versementId: string): Promise<GedVersement> {
  const data = await api.post<unknown>(`/ged/versements/${versementId}/soumettre`);
  return toSnakeCase<GedVersement>(data);
}

export interface ModifierVersementPayload {
  objet?: string;
  description?: string | null;
  entite_id?: string | null;
  dossier_cible_id?: string | null;
}

// Édition directe du brouillon par son rédacteur.
export async function modifierVersement(id: string, payload: ModifierVersementPayload): Promise<GedVersement> {
  const data = await api.patch<unknown>(`/ged/versements/${id}`, toCamelCase(payload));
  return toSnakeCase<GedVersement>(data);
}
