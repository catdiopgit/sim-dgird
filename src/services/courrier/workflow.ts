import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Entite } from '../administration/entites';
import type { Database } from '../../types/database';
import type { WorkflowHistoriqueEntree, WorkflowInstance } from '../workflow/generique';
import { listActionsDemandeesDestinataire, listDestinataires } from './destinataires';
import type { Courrier } from './courriers';

export type TypeActionCourrier = Database['public']['Enums']['type_action_courrier'];

export async function getWorkflowInstance(courrierId: string): Promise<WorkflowInstance> {
  const data = await api.get<unknown>(`/courrier/courriers/${courrierId}/workflow-instance`);
  return toSnakeCase<WorkflowInstance>(data);
}

export async function listWorkflowHistorique(courrierId: string): Promise<WorkflowHistoriqueEntree[]> {
  const data = await api.get<unknown[]>(`/courrier/courriers/${courrierId}/historique`);
  return toSnakeCase<WorkflowHistoriqueEntree[]>(data);
}

export async function executerTransitionCourrier(
  courrierId: string,
  transitionId: string,
  commentaire?: string | null,
): Promise<void> {
  await api.post(`/courrier/courriers/${courrierId}/transition`, { transitionId, commentaire: commentaire ?? null });
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
// condition) via le moteur de workflow générique — évite de reproduire cette
// logique côté client.
export async function listTransitionsDisponiblesCourrier(courrierId: string): Promise<TransitionDisponible[]> {
  const data = await api.get<unknown[]>(`/courrier/courriers/${courrierId}/transitions-disponibles`);
  return toSnakeCase<TransitionDisponible[]>(data);
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
  // même route — le type d'action est une donnée, pas 4 endpoints parallèles.
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
  const data = await api.post<unknown>(`/courrier/courriers/${payload.p_courrier_id}/imputer`, {
    entiteId: payload.p_entite_id,
    agentId: payload.p_agent_id ?? null,
    instruction: payload.p_instruction ?? null,
    echeance: payload.p_echeance ?? null,
    transitionId: payload.p_transition_id ?? null,
    commentaire: payload.p_commentaire ?? null,
    typeAction: payload.p_type_action ?? null,
    entitesCopieIds: payload.p_entites_copie_ids ?? null,
    actionsDemandeesIds: payload.p_actions_demandees_ids ?? null,
    prioriteValeurId: payload.p_priorite_valeur_id ?? null,
  });
  return toSnakeCase<Courrier>(data);
}

// Périmètre hiérarchique (V4 §8): entités sur lesquelles l'utilisateur courant
// a courrier/affecter (portée organisation ou entite_et_descendants, résolu
// dynamiquement côté serveur, jamais une liste statique).
export async function listEntitesImputables(): Promise<Entite[]> {
  const data = await api.get<unknown[]>('/courrier/entites-imputables');
  return toSnakeCase<Entite[]>(data);
}

// V5 §10: entités/personnes vers lesquelles l'utilisateur courant peut
// transmettre/rediriger — action distincte de 'affecter' (0042), même
// principe de résolution dynamique côté serveur.
export async function listEntitesTransmissibles(): Promise<Entite[]> {
  const data = await api.get<unknown[]>('/courrier/entites-transmissibles');
  return toSnakeCase<Entite[]>(data);
}

export interface PersonneTransmissible {
  utilisateur_id: string;
  entite_id: string;
}

// Retourne aussi l'entité de rattachement de chaque personne: choisir une
// personne dans la modale de transmission/redirection dérive automatiquement
// l'entité cible (p_entite_id), sans champ supplémentaire à saisir.
export async function listPersonnesTransmissibles(): Promise<PersonneTransmissible[]> {
  const data = await api.get<unknown[]>('/courrier/personnes-transmissibles');
  return toSnakeCase<PersonneTransmissible[]>(data);
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

// Timeline enrichie (V5 §14/§15): corrèle chaque ligne d'historique aux
// détails de l'action qui l'a déclenchée (entité principale, copies, actions
// demandées). Pas d'endpoint dédié côté backend (server/courrier/destinataires.service.ts
// n'expose que la liste par courrier + les actions par destinataire) : on
// recompose ici — liste des destinataires du courrier, filtrée par les ids
// d'historique affichés, puis actions demandées récupérées par destinataire.
export async function listHistoriqueActions(
  courrierId: string,
  workflowHistoriqueIds: string[],
): Promise<HistoriqueActionDestinataire[]> {
  if (workflowHistoriqueIds.length === 0) return [];
  const ids = new Set(workflowHistoriqueIds);
  const destinataires = (await listDestinataires(courrierId)).filter(
    (d) => d.workflow_historique_id && ids.has(d.workflow_historique_id),
  );
  const actionsParDestinataire = await Promise.all(
    destinataires.map((d) => listActionsDemandeesDestinataire(d.id)),
  );
  return destinataires.map((d, i) => ({
    id: d.id,
    workflow_historique_id: d.workflow_historique_id,
    type_diffusion: d.type_diffusion,
    type_action: d.type_action,
    entite_id: d.entite_id,
    utilisateur_id: d.utilisateur_id,
    instruction: d.instruction,
    echeance: d.echeance,
    actions_demandees_ids: actionsParDestinataire[i],
  }));
}
