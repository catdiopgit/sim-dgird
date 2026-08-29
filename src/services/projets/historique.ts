import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type JournalAudit = Database['public']['Tables']['journal_audit']['Row'];

// §10 Union de journal_audit sur tout le graphe d'objets du projet
// (projet/livrables/membres/avenants/documents) — server/projets/projets.service.ts, historique().
export async function fetchHistoriqueProjet(projetId: string): Promise<JournalAudit[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/historique`);
  return toSnakeCase<JournalAudit[]>(data);
}
