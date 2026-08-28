import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import { getUrlSigneeVersion, listInfosFichierVersions, verserVersion } from '../ged/documents';
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

// Même séquence à deux étapes que ajouterDocumentProjetAvecFichier
// (services/projets/documents.ts) : la ligne `documents` doit exister avant
// de pouvoir construire le chemin de stockage du fichier.
export async function ajouterDocumentMissionAvecFichier(
  payload: AjouterDocumentMissionPayload,
  fichier: File,
): Promise<Document> {
  const document = await callRpc<Document>('fn_ajouter_document_mission', { ...payload });
  try {
    await verserVersion(document.id, fichier);
  } catch (error) {
    await supabase.from('documents').delete().eq('id', document.id);
    throw error;
  }
  return document;
}

export async function getUrlTelechargementDocument(document: Document): Promise<string | null> {
  if (!document.version_courante_id) return null;
  const [version] = await listInfosFichierVersions([document.version_courante_id]);
  if (!version) return null;
  return getUrlSigneeVersion(version.storage_path);
}

export async function getDocumentParId(id: string): Promise<Document | null> {
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
