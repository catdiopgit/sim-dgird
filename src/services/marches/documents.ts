import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Document } from '../ged/documents';

export type { Document };

export interface AjouterDocumentMarchePayload {
  marche_id: string;
  titre: string;
  description?: string | null;
  type_marche_valeur_id?: string | null;
  phase_marche_id?: string | null;
  marche_candidat_id?: string | null;
}

// §9/§12/§15 — un seul appel multipart (server/marches/marches-documents.service.ts,
// ajouterDocumentAvecFichier) : crée le document et verse le fichier en une fois.
export async function ajouterDocumentMarcheAvecFichier(
  payload: AjouterDocumentMarchePayload,
  fichier: File,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', fichier);
  formData.append('titre', payload.titre);
  if (payload.description) formData.append('description', payload.description);
  if (payload.type_marche_valeur_id) formData.append('typeMarcheValeurId', payload.type_marche_valeur_id);
  if (payload.phase_marche_id) formData.append('phaseMarcheId', payload.phase_marche_id);
  if (payload.marche_candidat_id) formData.append('marcheCandidatId', payload.marche_candidat_id);
  const data = await api.upload<unknown>(`/marches/${payload.marche_id}/documents`, formData);
  return toSnakeCase<Document>(data);
}

export async function listDocumentsMarche(marcheId: string): Promise<Document[]> {
  const data = await api.get<unknown[]>(`/marches/${marcheId}/documents`);
  return toSnakeCase<Document[]>(data);
}

export async function listDocumentsPhaseMarche(phaseMarcheId: string): Promise<Document[]> {
  const data = await api.get<unknown[]>(`/marches/phases/${phaseMarcheId}/documents`);
  return toSnakeCase<Document[]>(data);
}

export async function listDocumentsMarcheCandidat(marcheCandidatId: string): Promise<Document[]> {
  const data = await api.get<unknown[]>(`/marches/candidats/${marcheCandidatId}/documents`);
  return toSnakeCase<Document[]>(data);
}

export async function getUrlTelechargementDocument(document: Document): Promise<string | null> {
  if (!document.version_courante_id) return null;
  return `/ged/versions/${document.version_courante_id}/telecharger`;
}
