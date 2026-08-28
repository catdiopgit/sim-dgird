import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import type { Database } from '../../types/database';

export type Document = Database['public']['Tables']['documents']['Row'];
export type DocumentVersion = Database['public']['Tables']['document_versions']['Row'];

const BUCKET = 'ged-documents';

export async function listDocumentsVersement(versementId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('versement_id', versementId)
    .is('supprime_le', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getDocument(id: string): Promise<Document> {
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function listVersions(documentId: string): Promise<DocumentVersion[]> {
  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('version_majeure', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface AjouterDocumentVersementPayload {
  p_versement_id: string;
  p_titre: string;
  p_description?: string | null;
  p_confidentialite_valeur_id?: string | null;
  p_duree_conservation_mois?: number | null;
}

// Ajoute un document au versement puis verse son premier fichier : le chemin
// de stockage ({document_id}/{uuid}-{nom}) exige que la ligne documents
// existe déjà, donc l'upload ne peut se faire qu'après fn_ajouter_document_versement.
export async function ajouterDocumentAvecFichier(
  payload: AjouterDocumentVersementPayload,
  fichier: File,
): Promise<Document> {
  const document = await callRpc<Document>('fn_ajouter_document_versement', { ...payload });
  try {
    await verserVersion(document.id, fichier);
  } catch (error) {
    await supabase.from('documents').delete().eq('id', document.id);
    throw error;
  }
  return document;
}

export async function verserVersion(
  documentId: string,
  fichier: File,
  commentaire?: string | null,
): Promise<DocumentVersion> {
  const chemin = `${documentId}/${crypto.randomUUID()}-${fichier.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(chemin, fichier);
  if (uploadError) throw uploadError;

  try {
    return await callRpc<DocumentVersion>('fn_verser_version_document', {
      p_document_id: documentId,
      p_storage_path: chemin,
      p_nom_fichier: fichier.name,
      p_taille_octets: fichier.size,
      p_type_mime: fichier.type || null,
      p_commentaire: commentaire ?? null,
    });
  } catch (error) {
    await supabase.storage.from(BUCKET).remove([chemin]);
    throw error;
  }
}

export type InfosFichierVersion = Pick<
  DocumentVersion,
  'id' | 'nom_fichier' | 'type_mime' | 'taille_octets' | 'storage_path'
>;

// Les infos de fichier affichables (nom réel, type MIME, taille, chemin de
// stockage) vivent sur document_versions, pas sur documents — jointe côté
// client par lot pour les cartes de l'explorateur Archives plutôt que
// d'alourdir fn_rechercher_documents.
export async function listInfosFichierVersions(versionIds: string[]): Promise<InfosFichierVersion[]> {
  if (versionIds.length === 0) return [];
  const { data, error } = await supabase
    .from('document_versions')
    .select('id, nom_fichier, type_mime, taille_octets, storage_path')
    .in('id', versionIds);
  if (error) throw error;
  return data ?? [];
}

export async function getUrlSigneeVersion(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

export interface ModifierDocumentPayload {
  titre?: string;
  description?: string | null;
  confidentialite_valeur_id?: string | null;
  duree_conservation_mois?: number | null;
}

// Édition légère par l'agent tant que le versement est en brouillon: mise à
// jour directe (documents_update, RLS 0015, applique bien created_by sur
// UPDATE) — pas besoin de RPC pont pour ça.
export async function modifierDocument(id: string, payload: ModifierDocumentPayload): Promise<Document> {
  const { data, error } = await supabase.from('documents').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
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
  return callRpc<Document>('fn_classer_document', { ...payload });
}
