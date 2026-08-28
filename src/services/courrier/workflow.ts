import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
import type { Entite } from '../administration/entites';
import type { Database } from '../../types/database';
import type { Courrier } from './courriers';

// Tables génériques du moteur de workflow (instance/étape/historique par id,
// sans rien de spécifique à Courrier) : déplacées vers
// services/workflow/generique.ts (partagées avec GED), réexportées ici pour
// ne rien casser des imports existants côté Courrier.
export {
  getWorkflowInstance,
  listWorkflowEtapes,
  listWorkflowHistorique,
  type WorkflowInstance,
  type WorkflowEtape,
  type WorkflowHistoriqueEntree,
} from '../workflow/generique';

export type WorkflowTransition = Database['public']['Tables']['workflow_transitions']['Row'];
export type WorkflowTransitionRole = Database['public']['Tables']['workflow_transition_roles']['Row'];
export type TypeActionCourrier = Database['public']['Enums']['type_action_courrier'];

export async function listWorkflowTransitions(workflowDefinitionId: string): Promise<WorkflowTransition[]> {
  const { data, error } = await supabase
    .from('workflow_transitions')
    .select('*')
    .eq('workflow_definition_id', workflowDefinitionId);
  if (error) throw error;
  return data ?? [];
}

export async function listWorkflowTransitionRoles(
  transitionIds: string[],
): Promise<WorkflowTransitionRole[]> {
  if (transitionIds.length === 0) return [];
  const { data, error } = await supabase
    .from('workflow_transition_roles')
    .select('*')
    .in('workflow_transition_id', transitionIds);
  if (error) throw error;
  return data ?? [];
}

export async function executerTransitionCourrier(
  courrierId: string,
  transitionId: string,
  commentaire?: string | null,
): Promise<void> {
  await callRpc<null>('fn_executer_transition_courrier', {
    p_courrier_id: courrierId,
    p_transition_id: transitionId,
    p_commentaire: commentaire ?? null,
  });
}

export interface TransitionDisponible {
  transition_id: string;
  code: string;
  libelle_action: string;
  etape_cible_id: string;
  etape_cible_libelle: string;
  // V5: transitions tagguées ouvrent la fenêtre modale d'action (Imputer à /
  // En copie / Actions demandées) au lieu du Popconfirm actuel — donnée de
  // configuration (workflow_transitions.type_action), jamais une
  // correspondance de code/libellé côté client.
  type_action: TypeActionCourrier | null;
}

// Résolution serveur (acteur polymorphe rôle/fonction/entité/délégation +
// condition) via public.fn_transitions_disponibles_courrier (migration 0020) —
// évite de reproduire cette logique côté client.
export async function listTransitionsDisponiblesCourrier(courrierId: string): Promise<TransitionDisponible[]> {
  return callRpc<TransitionDisponible[]>('fn_transitions_disponibles_courrier', {
    p_courrier_id: courrierId,
  });
}

export interface ImputerCourrierPayload {
  p_courrier_id: string;
  p_entite_id: string;
  p_agent_id?: string | null;
  p_instruction?: string | null;
  p_echeance?: string | null;
  p_transition_id?: string | null;
  p_commentaire?: string | null;
  // V5 (0042): Affectation/Imputation/Transmission/Redirection portées par la
  // même fonction — le type d'action est une donnée, pas 4 RPC parallèles.
  p_type_action?: TypeActionCourrier | null;
  p_entites_copie_ids?: string[] | null;
  p_actions_demandees_ids?: string[] | null;
  p_priorite_valeur_id?: string | null;
}

// Imputation = action de workflow à part entière (0029): met à jour l'entité/
// l'agent en charge, enregistre l'instruction/échéance et peut déclencher une
// transition (typiquement "affecter"), en une seule opération transactionnelle
// côté serveur plutôt que deux appels séparés côté client.
export async function imputerCourrier(payload: ImputerCourrierPayload): Promise<Courrier> {
  return callRpc<Courrier>('fn_imputer_courrier', { ...payload });
}

// Périmètre hiérarchique (V4 §8): entités sur lesquelles l'utilisateur courant
// a courrier/affecter (portée organisation ou entite_et_descendants, ltree
// @> côté serveur — cf. 0034). Résolu dynamiquement, jamais une liste statique.
export async function listEntitesImputables(): Promise<Entite[]> {
  return callRpc<Entite[]>('fn_entites_imputables');
}

// V5 §10: entités/personnes vers lesquelles l'utilisateur courant peut
// transmettre/rediriger — action distincte de 'affecter' (0042), même
// principe de résolution dynamique côté serveur.
export async function listEntitesTransmissibles(): Promise<Entite[]> {
  return callRpc<Entite[]>('fn_entites_transmissibles');
}

export interface PersonneTransmissible {
  utilisateur_id: string;
  entite_id: string;
}

// Retourne aussi l'entité de rattachement de chaque personne: choisir une
// personne dans la modale de transmission/redirection dérive automatiquement
// l'entité cible (p_entite_id), sans champ supplémentaire à saisir.
export async function listPersonnesTransmissibles(): Promise<PersonneTransmissible[]> {
  return callRpc<PersonneTransmissible[]>('fn_personnes_transmissibles');
}

export interface HistoriqueActionDestinataire {
  id: string;
  workflow_historique_id: string | null;
  type_diffusion: Database['public']['Enums']['type_diffusion_courrier'];
  type_action: TypeActionCourrier | null;
  entite_id: string | null;
  utilisateur_id: string | null;
  instruction: string | null;
  echeance: string | null;
  actions_demandees_ids: string[];
}

// Timeline enrichie (V5 §14/§15): corrèle chaque ligne workflow_historique
// aux détails de l'action qui l'a déclenchée (entité principale, copies,
// actions demandées) via courrier_destinataires.workflow_historique_id
// (0042/0043) — évite de dupliquer cette donnée dans workflow_historique
// lui-même.
export async function listHistoriqueActions(
  workflowHistoriqueIds: string[],
): Promise<HistoriqueActionDestinataire[]> {
  if (workflowHistoriqueIds.length === 0) return [];
  const { data: destinataires, error } = await supabase
    .from('courrier_destinataires')
    .select('id, workflow_historique_id, type_diffusion, type_action, entite_id, utilisateur_id, instruction, echeance')
    .in('workflow_historique_id', workflowHistoriqueIds);
  if (error) throw error;

  const destinataireIds = (destinataires ?? []).map((d) => d.id);
  let actionsParDestinataire = new Map<string, string[]>();
  if (destinataireIds.length > 0) {
    const { data: actions, error: actionsError } = await supabase
      .from('courrier_destinataire_actions')
      .select('courrier_destinataire_id, valeur_liste_id')
      .in('courrier_destinataire_id', destinataireIds);
    if (actionsError) throw actionsError;
    actionsParDestinataire = (actions ?? []).reduce((acc, a) => {
      const liste = acc.get(a.courrier_destinataire_id) ?? [];
      liste.push(a.valeur_liste_id);
      acc.set(a.courrier_destinataire_id, liste);
      return acc;
    }, new Map<string, string[]>());
  }

  return (destinataires ?? []).map((d) => ({
    ...d,
    actions_demandees_ids: actionsParDestinataire.get(d.id) ?? [],
  }));
}
