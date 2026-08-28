import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import { getUrlSigneeVersion, listInfosFichierVersions, verserVersion } from '../ged/documents';
import type { Document } from '../ged/documents';

export type { Document };

// §6 Espace documentaire du projet. Deux étapes comme en GED V2 (voir
// services/ged/documents.ts:ajouterDocumentAvecFichier) : la ligne
// `documents` doit exister avant de pouvoir construire le chemin de stockage
// du fichier ({document_id}/{uuid}-{nom}).
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
  const document = await callRpc<Document>('fn_ajouter_document_projet', { ...payload });
  try {
    await verserVersion(document.id, fichier);
  } catch (error) {
    await supabase.from('documents').delete().eq('id', document.id);
    throw error;
  }
  return document;
}

export async function listDocumentsProjet(projetId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('projet_id', projetId)
    .is('supprime_le', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Signe une URL de téléchargement à partir de la version courante du
// document (le stockage réel — nom de fichier, chemin, taille — vit sur
// document_versions, pas sur documents ; voir ged/documents.ts).
export async function getUrlTelechargementDocument(document: Document): Promise<string | null> {
  if (!document.version_courante_id) return null;
  const [version] = await listInfosFichierVersions([document.version_courante_id]);
  if (!version) return null;
  return getUrlSigneeVersion(version.storage_path);
}

export async function listDocumentsLivrable(livrableId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('livrable_id', livrableId)
    .is('supprime_le', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
