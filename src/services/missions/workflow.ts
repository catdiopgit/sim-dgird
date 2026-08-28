import { callRpc } from '../rpc';

export interface TransitionDisponibleMission {
  transition_id: string;
  code: string;
  libelle_action: string;
  etape_cible_id: string;
  etape_cible_libelle: string;
}

export async function listTransitionsDisponiblesMission(missionId: string): Promise<TransitionDisponibleMission[]> {
  return callRpc<TransitionDisponibleMission[]>('fn_transitions_disponibles_mission', {
    p_mission_id: missionId,
  });
}

export async function executerTransitionMission(
  missionId: string,
  transitionId: string,
  commentaire?: string | null,
): Promise<void> {
  await callRpc<null>('fn_executer_transition_mission', {
    p_mission_id: missionId,
    p_transition_id: transitionId,
    p_commentaire: commentaire ?? null,
  });
}
