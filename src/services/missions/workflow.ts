import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { WorkflowHistoriqueEntree, WorkflowInstance } from '../workflow/generique';

export interface TransitionDisponibleMission {
  transition_id: string;
  code: string;
  libelle_action: string;
  etape_cible_id: string;
  etape_cible_libelle: string;
}

export async function listTransitionsDisponiblesMission(missionId: string): Promise<TransitionDisponibleMission[]> {
  const data = await api.get<unknown[]>(`/missions/${missionId}/transitions-disponibles`);
  return toSnakeCase<TransitionDisponibleMission[]>(data);
}

export async function executerTransitionMission(
  missionId: string,
  transitionId: string,
  commentaire?: string | null,
): Promise<void> {
  await api.post(`/missions/${missionId}/transitions`, { transitionId, commentaire: commentaire ?? null });
}

export async function getWorkflowInstance(missionId: string): Promise<WorkflowInstance> {
  const data = await api.get<unknown>(`/missions/${missionId}/workflow-instance`);
  return toSnakeCase<WorkflowInstance>(data);
}

export async function listWorkflowHistorique(missionId: string): Promise<WorkflowHistoriqueEntree[]> {
  const data = await api.get<unknown[]>(`/missions/${missionId}/workflow-historique`);
  return toSnakeCase<WorkflowHistoriqueEntree[]>(data);
}
