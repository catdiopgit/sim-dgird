import { callRpc } from '../rpc';

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
  return callRpc<TransitionDisponibleGed[]>('fn_transitions_disponibles_versement', {
    p_versement_id: versementId,
  });
}

export async function executerTransitionVersement(
  versementId: string,
  transitionId: string,
  commentaire?: string | null,
): Promise<void> {
  await callRpc<null>('fn_executer_transition_versement', {
    p_versement_id: versementId,
    p_transition_id: transitionId,
    p_commentaire: commentaire ?? null,
  });
}
