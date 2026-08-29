import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import { getDocument } from '../ged/documents';
import type { Document } from '../ged/documents';

export type { Document };

export type RoleDocumentMission = 'ordre_mission' | 'compte_rendu' | 'pv' | 'depense';

export interface AjouterDocumentMissionPayload {
  p_mission_id: string;
  p_titre: string;
  p_role: RoleDocumentMission;
  p_description?: string | null;
  p_depense_id?: string | null;
}

// Un seul appel multipart côté backend (server/missions/missions-documents.service.ts,
// ajouterDocumentAvecFichier) — compose déjà la création + le versement du
// fichier, avec repli automatique si l'upload échoue.
export async function ajouterDocumentMissionAvecFichier(
  payload: AjouterDocumentMissionPayload,
  fichier: File,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', fichier);
  formData.append('titre', payload.p_titre);
  formData.append('role', payload.p_role);
  if (payload.p_description) formData.append('description', payload.p_description);
  if (payload.p_depense_id) formData.append('depenseId', payload.p_depense_id);
  const data = await api.upload<unknown>(`/missions/${payload.p_mission_id}/documents`, formData);
  return toSnakeCase<Document>(data);
}

// Chemin d'API de téléchargement authentifié à passer à ouvrirFichier/
// telechargerFichier (config/apiClient.ts).
export async function getUrlTelechargementDocument(document: Document): Promise<string | null> {
  if (!document.version_courante_id) return null;
  return `/ged/versions/${document.version_courante_id}/telecharger`;
}

// Pas de route GET /missions/documents/:id dédiée : le document est visible
// au même titre que n'importe quel document GED — réutilise l'endpoint
// générique (GedDocumentsService.findOne couvre déjà can_view_document pour
// les documents rattachés à une mission, cf. MIGRATION.md Phase 6).
export async function getDocumentParId(id: string): Promise<Document | null> {
  try {
    return await getDocument(id);
  } catch {
    return null;
  }
}
