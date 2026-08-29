import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type JournalAuditRow = Database['public']['Tables']['journal_audit']['Row'];

export interface AuditCourrierEntree {
  action: string;
  champ: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  utilisateur_id: string | null;
  created_at: string;
}

// Diff champ par champ calculé côté serveur à partir des snapshots JSONB de
// journal_audit — pas de duplication de logique côté client.
export async function listAuditCourrier(courrierId: string): Promise<AuditCourrierEntree[]> {
  return api.get<AuditCourrierEntree[]>(`/courrier/courriers/${courrierId}/audit`);
}

export interface AuditFiltres {
  objetType?: string;
}

// Vue d'ensemble Administration → Audit.
export async function listJournalAudit(
  _organisationId: string,
  filtres: AuditFiltres = {},
): Promise<JournalAuditRow[]> {
  const data = await api.get<unknown[]>('/administration/journal-audit', { objetType: filtres.objetType });
  return toSnakeCase<JournalAuditRow[]>(data);
}
