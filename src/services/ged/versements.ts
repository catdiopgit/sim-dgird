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
  p_date_debut_extreme?: string | null;
  p_date_fin_extreme?: string | null;
}

export async function creerVersement(payload: CreerVersementPayload): Promise<GedVersement> {
  const data = await api.post<unknown>('/ged/versements', {
    objet: payload.p_objet,
    entiteId: payload.p_entite_id ?? null,
    dossierCibleId: payload.p_dossier_cible_id ?? null,
    description: payload.p_description ?? null,
    dateDebutExtreme: payload.p_date_debut_extreme || null,
    dateFinExtreme: payload.p_date_fin_extreme || null,
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
  date_debut_extreme?: string | null;
  date_fin_extreme?: string | null;
}

// Édition directe du brouillon par son rédacteur.
export async function modifierVersement(id: string, payload: ModifierVersementPayload): Promise<GedVersement> {
  const data = await api.patch<unknown>(`/ged/versements/${id}`, toCamelCase(payload));
  return toSnakeCase<GedVersement>(data);
}

// v8.6 : brouillons — retirer un document, annuler le versement.
export async function retirerDocumentVersement(versementId: string, documentId: string): Promise<void> {
  await api.delete(`/ged/versements/${versementId}/documents/${documentId}`);
}

export async function annulerVersement(versementId: string): Promise<void> {
  await api.post(`/ged/versements/${versementId}/annuler`, {});
}

export interface DoublonDocument {
  documentId: string;
  titre: string | null;
  versementId: string | null;
  versementObjet: string | null;
  archive: boolean;
}

// Doublons (même fichier, empreinte SHA-256) de chaque document du versement.
export async function listDoublonsVersement(versementId: string): Promise<Record<string, DoublonDocument[]>> {
  return api.get<Record<string, DoublonDocument[]>>(`/ged/versements/${versementId}/doublons`);
}

// v8.6.4 : classement du versement par l'archiviste — code d'archivage saisi
// + emplacement dans le plan ; le serveur crée le dossier du versement et y
// range tous ses documents.
export async function classerVersement(
  versementId: string,
  payload: { codeArchivage: string; dossierParentId: string },
): Promise<GedVersement> {
  const data = await api.post<unknown>(`/ged/versements/${versementId}/classer`, payload);
  return toSnakeCase<GedVersement>(data);
}

// v8.6.11 : direction versante proposée (direction de l'agent) et, pour
// l'archiviste, liste des directions au choix.
export interface DirectionVersante {
  id: string;
  sigle: string | null;
  libelle: string;
}
export async function optionsCreationVersement(): Promise<{
  archiviste: boolean;
  directionParDefaut: DirectionVersante | null;
  directions: DirectionVersante[];
}> {
  return api.get('/ged/versements/options/creation');
}
