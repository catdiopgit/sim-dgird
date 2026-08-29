import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { WorkflowHistoriqueEntree, WorkflowInstance } from '../workflow/generique';

export interface TransitionDisponibleGed {
  transition_id: string;
  code: string;
  libelle_action: string;
  etape_cible_id: string;
  etape_cible_libelle: string;
}

// Résolution serveur (acteur + condition), portée par le versement (le
// workflow ne vit plus sur chaque document individuellement, cf. GED V2).
export async function listTransitionsDisponiblesVersement(versementId: string): Promise<TransitionDisponibleGed[]> {
  const data = await api.get<unknown[]>(`/ged/versements/${versementId}/transitions-disponibles`);
  return toSnakeCase<TransitionDisponibleGed[]>(data);
}

export async function executerTransitionVersement(
  versementId: string,
  transitionId: string,
  commentaire?: string | null,
): Promise<void> {
  await api.post(`/ged/versements/${versementId}/transition`, { transitionId, commentaire: commentaire ?? null });
}

export async function getWorkflowInstance(versementId: string): Promise<WorkflowInstance> {
  const data = await api.get<unknown>(`/ged/versements/${versementId}/workflow-instance`);
  return toSnakeCase<WorkflowInstance>(data);
}

export async function listWorkflowHistorique(versementId: string): Promise<WorkflowHistoriqueEntree[]> {
  const data = await api.get<unknown[]>(`/ged/versements/${versementId}/historique`);
  return toSnakeCase<WorkflowHistoriqueEntree[]>(data);
}
