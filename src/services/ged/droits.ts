import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type DocumentDroit = Database['public']['Tables']['document_droits']['Row'];
export type DossierDroit = Database['public']['Tables']['dossier_droits']['Row'];

export async function listDroitsDocument(documentId: string): Promise<DocumentDroit[]> {
  const data = await api.get<unknown[]>(`/ged/documents/${documentId}/droits`);
  return toSnakeCase<DocumentDroit[]>(data);
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
  const data = await api.post<unknown>(`/ged/documents/${documentId}/droits`, {
    actionCode: payload.p_action_code,
    roleId: payload.p_role_id ?? null,
    utilisateurId: payload.p_utilisateur_id ?? null,
    entiteId: payload.p_entite_id ?? null,
  });
  return toSnakeCase<DocumentDroit>(data);
}

export async function revoquerDroitDocument(droitId: string): Promise<void> {
  await api.delete(`/ged/documents/droits/${droitId}`);
}

export async function listDroitsDossier(dossierId: string): Promise<DossierDroit[]> {
  const data = await api.get<unknown[]>(`/ged/dossiers/${dossierId}/droits`);
  return toSnakeCase<DossierDroit[]>(data);
}

export async function octroyerDroitDossier(
  dossierId: string,
  payload: OctroyerDroitPayload,
): Promise<DossierDroit> {
  const data = await api.post<unknown>(`/ged/dossiers/${dossierId}/droits`, {
    actionCode: payload.p_action_code,
    roleId: payload.p_role_id ?? null,
    utilisateurId: payload.p_utilisateur_id ?? null,
    entiteId: payload.p_entite_id ?? null,
  });
  return toSnakeCase<DossierDroit>(data);
}

export async function revoquerDroitDossier(droitId: string): Promise<void> {
  await api.delete(`/ged/dossiers/droits/${droitId}`);
}
