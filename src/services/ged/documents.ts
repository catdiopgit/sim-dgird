import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Document = Database['public']['Tables']['documents']['Row'];
export type DocumentVersion = Database['public']['Tables']['document_versions']['Row'];

export async function listDocumentsVersement(versementId: string): Promise<Document[]> {
  const data = await api.get<unknown[]>(`/ged/versements/${versementId}/documents`);
  return toSnakeCase<Document[]>(data);
}

export async function getDocument(id: string): Promise<Document> {
  const data = await api.get<unknown>(`/ged/documents/${id}`);
  return toSnakeCase<Document>(data);
}

export async function listVersions(documentId: string): Promise<DocumentVersion[]> {
  const data = await api.get<unknown[]>(`/ged/documents/${documentId}/versions`);
  return toSnakeCase<DocumentVersion[]>(data);
}

export interface AjouterDocumentVersementPayload {
  p_versement_id: string;
  p_titre: string;
  p_description?: string | null;
  p_confidentialite_valeur_id?: string | null;
  p_duree_conservation_mois?: number | null;
}

// Portage de fn_ajouter_document_versement + fn_verser_version_document en un
// seul endpoint multipart (server/ged/ged-storage.service.ts,
// creerDocumentAvecFichier) — plus besoin de composer deux appels côté client.
export async function ajouterDocumentAvecFichier(
  payload: AjouterDocumentVersementPayload,
  fichier: File,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', fichier);
  formData.append('titre', payload.p_titre);
  if (payload.p_description) formData.append('description', payload.p_description);
  if (payload.p_confidentialite_valeur_id) formData.append('confidentialiteValeurId', payload.p_confidentialite_valeur_id);
  if (payload.p_duree_conservation_mois != null) {
    formData.append('dureeConservationMois', String(payload.p_duree_conservation_mois));
  }
  const data = await api.upload<unknown>(`/ged/versements/${payload.p_versement_id}/documents`, formData);
  return toSnakeCase<Document>(data);
}

export async function verserVersion(
  documentId: string,
  fichier: File,
  commentaire?: string | null,
): Promise<DocumentVersion> {
  const formData = new FormData();
  formData.append('file', fichier);
  if (commentaire) formData.append('commentaire', commentaire);
  const data = await api.upload<unknown>(`/ged/documents/${documentId}/versions`, formData);
  return toSnakeCase<DocumentVersion>(data);
}

export type InfosFichierVersion = Pick<
  DocumentVersion,
  'id' | 'nom_fichier' | 'type_mime' | 'taille_octets' | 'storage_path'
>;

// Les infos de fichier affichables (nom réel, type MIME, taille) vivent sur
// document_versions, pas sur documents. Pas de route document_versions par id
// isolé côté backend (seulement par document, cf. listVersions ci-dessus) :
// une requête listVersions par document (déduplication par id document côté
// appelant, volumes faibles), on y retrouve la version courante — pour les
// cartes de l'explorateur Archives.
export async function listInfosFichierDocuments(
  documents: Array<{ id: string; version_courante_id: string | null }>,
): Promise<InfosFichierVersion[]> {
  const avecVersion = documents.filter((d) => d.version_courante_id);
  const resultats = await Promise.all(
    avecVersion.map(async (d) => {
      const versions = await listVersions(d.id);
      return versions.find((v) => v.id === d.version_courante_id) ?? null;
    }),
  );
  return resultats.filter((v): v is DocumentVersion => v !== null);
}

export interface ModifierDocumentPayload {
  titre?: string;
  description?: string | null;
  confidentialite_valeur_id?: string | null;
  duree_conservation_mois?: number | null;
}

export async function modifierDocument(id: string, payload: ModifierDocumentPayload): Promise<Document> {
  const data = await api.patch<unknown>(`/ged/documents/${id}`, toCamelCase(payload));
  return toSnakeCase<Document>(data);
}

export interface ClasserDocumentPayload {
  p_document_id: string;
  p_titre?: string | null;
  p_dossier_id?: string | null;
  p_mots_cles?: string[] | null;
}

// Classement définitif par l'archiviste (étape "Classement documentaire") :
// renommage, dossier (plan de classement, ged_dossiers) et mots-clés
// d'indexation, document par document — p_dossier_id retombe sur le dossier
// cible du versement côté serveur si non fourni.
export async function classerDocument(payload: ClasserDocumentPayload): Promise<Document> {
  const data = await api.post<unknown>(`/ged/documents/${payload.p_document_id}/classer`, {
    titre: payload.p_titre ?? undefined,
    dossierId: payload.p_dossier_id ?? undefined,
    motsCles: payload.p_mots_cles ?? undefined,
  });
  return toSnakeCase<Document>(data);
}
