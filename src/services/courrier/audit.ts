import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
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

// Diff champ par champ calculé côté serveur (public.fn_journal_audit_courrier,
// 0035) à partir des snapshots JSONB de journal_audit (0013) — pas de
// duplication de logique côté client.
export async function listAuditCourrier(courrierId: string): Promise<AuditCourrierEntree[]> {
  return callRpc<AuditCourrierEntree[]>('fn_journal_audit_courrier', { p_courrier_id: courrierId });
}

export interface AuditFiltres {
  objetType?: string;
  recherche?: string;
}

// Vue d'ensemble Administration → Audit: lecture directe de journal_audit,
// déjà protégée par la policy RLS journal_audit_select
// (has_permission('administration','consulter')) — aucune nouvelle RPC requise.
export async function listJournalAudit(
  organisationId: string,
  filtres: AuditFiltres = {},
): Promise<JournalAuditRow[]> {
  let query = supabase
    .from('journal_audit')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filtres.objetType) query = query.eq('objet_type', filtres.objetType);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
