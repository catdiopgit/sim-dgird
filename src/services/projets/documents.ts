import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Document } from '../ged/documents';

export type { Document };

// §6 Espace documentaire du projet. Un seul appel multipart côté backend
// (server/projets/projets-documents.service.ts, ajouterDocumentAvecFichier) —
// compose déjà la création + le versement du fichier, avec repli automatique
// si l'upload échoue.
export interface AjouterDocumentProjetPayload {
  p_projet_id: string;
  p_titre: string;
  p_description?: string | null;
  p_type_projet_valeur_id?: string | null;
  p_livrable_id?: string | null;
  p_avenant_id?: string | null;
  p_decaissement_id?: string | null;
}

export async function ajouterDocumentProjetAvecFichier(
  payload: AjouterDocumentProjetPayload,
  fichier: File,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', fichier);
  formData.append('titre', payload.p_titre);
  if (payload.p_description) formData.append('description', payload.p_description);
  if (payload.p_type_projet_valeur_id) formData.append('typeProjetValeurId', payload.p_type_projet_valeur_id);
  if (payload.p_livrable_id) formData.append('livrableId', payload.p_livrable_id);
  if (payload.p_avenant_id) formData.append('avenantId', payload.p_avenant_id);
  const data = await api.upload<unknown>(`/projets/${payload.p_projet_id}/documents`, formData);
  return toSnakeCase<Document>(data);
}

export async function listDocumentsProjet(projetId: string): Promise<Document[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/documents`);
  return toSnakeCase<Document[]>(data);
}

// Chemin d'API de téléchargement authentifié à passer à ouvrirFichier/
// telechargerFichier (config/apiClient.ts) — le stockage réel (nom de
// fichier, taille) vit sur document_versions, pas sur documents.
export async function getUrlTelechargementDocument(document: Document): Promise<string | null> {
  if (!document.version_courante_id) return null;
  return `/ged/versions/${document.version_courante_id}/telecharger`;
}

export async function listDocumentsLivrable(livrableId: string): Promise<Document[]> {
  const data = await api.get<unknown[]>(`/projets/livrables/${livrableId}/documents`);
  return toSnakeCase<Document[]>(data);
}
