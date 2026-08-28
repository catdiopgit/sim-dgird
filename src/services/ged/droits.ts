import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import type { Database } from '../../types/database';

export type DocumentDroit = Database['public']['Tables']['document_droits']['Row'];
export type DossierDroit = Database['public']['Tables']['dossier_droits']['Row'];

export async function listDroitsDocument(documentId: string): Promise<DocumentDroit[]> {
  const { data, error } = await supabase
    .from('document_droits')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface OctroyerDroitPayload {
  p_action_code: string;
  p_role_id?: string | null;
  p_utilisateur_id?: string | null;
  p_entite_id?: string | null;
}

export async function octroyerDroitDocument(
  documentId: string,
  payload: OctroyerDroitPayload,
): Promise<DocumentDroit> {
  return callRpc<DocumentDroit>('fn_octroyer_droit_document', { p_document_id: documentId, ...payload });
}

export async function revoquerDroitDocument(droitId: string): Promise<void> {
  await callRpc<null>('fn_revoquer_droit_document', { p_droit_id: droitId });
}

export async function listDroitsDossier(dossierId: string): Promise<DossierDroit[]> {
  const { data, error } = await supabase
    .from('dossier_droits')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function octroyerDroitDossier(
  dossierId: string,
  payload: OctroyerDroitPayload,
): Promise<DossierDroit> {
  return callRpc<DossierDroit>('fn_octroyer_droit_dossier', { p_dossier_id: dossierId, ...payload });
}

export async function revoquerDroitDossier(droitId: string): Promise<void> {
  await callRpc<null>('fn_revoquer_droit_dossier', { p_droit_id: droitId });
}
