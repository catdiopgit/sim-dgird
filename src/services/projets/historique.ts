import { callRpc } from '../rpc';
import type { Database } from '../../types/database';

export type JournalAudit = Database['public']['Tables']['journal_audit']['Row'];

// §10 Union de journal_audit sur tout le graphe d'objets du projet
// (projet/phases/activités/tâches/livrables/membres/avenants/documents) —
// voir fn_historique_projet (0066).
export async function fetchHistoriqueProjet(projetId: string): Promise<JournalAudit[]> {
  return callRpc<JournalAudit[]>('fn_historique_projet', { p_projet_id: projetId });
}
