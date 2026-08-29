import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type WorkflowDefinition = Database['public']['Tables']['workflow_definitions']['Row'];
export type WorkflowDefinitionInsert = Database['public']['Tables']['workflow_definitions']['Insert'];
export type WorkflowDefinitionUpdate = Database['public']['Tables']['workflow_definitions']['Update'];
export type WorkflowEtape = Database['public']['Tables']['workflow_etapes']['Row'];
export type WorkflowEtapeInsert = Database['public']['Tables']['workflow_etapes']['Insert'];
export type WorkflowEtapeUpdate = Database['public']['Tables']['workflow_etapes']['Update'];
export type WorkflowTransition = Database['public']['Tables']['workflow_transitions']['Row'];
export type WorkflowTransitionInsert = Database['public']['Tables']['workflow_transitions']['Insert'];
export type WorkflowTransitionUpdate = Database['public']['Tables']['workflow_transitions']['Update'];
export type WorkflowActeur = Database['public']['Tables']['workflow_transition_roles']['Row'];
export type WorkflowActeurInsert = Database['public']['Tables']['workflow_transition_roles']['Insert'];
export type WorkflowDefinitionAssociation =
  Database['public']['Tables']['workflow_definition_associations']['Row'];
export type WorkflowDefinitionAssociationInsert =
  Database['public']['Tables']['workflow_definition_associations']['Insert'];

// --- Définitions ---

// organisationId n'est pas transmis en paramètre de requête : le backend le
// déduit de l'utilisateur courant (JWT) — voir WorkflowController.findDefinitions.
export async function listWorkflowDefinitions(
  _organisationId: string,
  moduleId?: string,
): Promise<WorkflowDefinition[]> {
  const data = await api.get<unknown[]>('/administration/workflows/definitions', { moduleId });
  return toSnakeCase<WorkflowDefinition[]>(data);
}

export async function createWorkflowDefinition(insert: WorkflowDefinitionInsert): Promise<WorkflowDefinition> {
  const data = await api.post<unknown>('/administration/workflows/definitions', toCamelCase(insert));
  return toSnakeCase<WorkflowDefinition>(data);
}

export async function updateWorkflowDefinition(
  id: string,
  patch: WorkflowDefinitionUpdate,
): Promise<WorkflowDefinition> {
  const data = await api.patch<unknown>(`/administration/workflows/definitions/${id}`, toCamelCase(patch));
  return toSnakeCase<WorkflowDefinition>(data);
}

export async function deleteWorkflowDefinition(id: string): Promise<void> {
  await api.delete(`/administration/workflows/definitions/${id}`);
}

export async function definirWorkflowDefinitionDefaut(id: string): Promise<WorkflowDefinition> {
  const data = await api.post<unknown>(`/administration/workflows/definitions/${id}/definir-defaut`);
  return toSnakeCase<WorkflowDefinition>(data);
}

// --- Étapes ---

export async function listWorkflowEtapes(workflowDefinitionId: string): Promise<WorkflowEtape[]> {
  const data = await api.get<unknown[]>(`/administration/workflows/definitions/${workflowDefinitionId}/etapes`);
  return toSnakeCase<WorkflowEtape[]>(data);
}

export async function createWorkflowEtape(insert: WorkflowEtapeInsert): Promise<WorkflowEtape> {
  const data = await api.post<unknown>('/administration/workflows/etapes', toCamelCase(insert));
  return toSnakeCase<WorkflowEtape>(data);
}

export async function updateWorkflowEtape(id: string, patch: WorkflowEtapeUpdate): Promise<WorkflowEtape> {
  const data = await api.patch<unknown>(`/administration/workflows/etapes/${id}`, toCamelCase(patch));
  return toSnakeCase<WorkflowEtape>(data);
}

export async function deleteWorkflowEtape(id: string): Promise<void> {
  await api.delete(`/administration/workflows/etapes/${id}`);
}

// --- Transitions ---

export async function listWorkflowTransitions(workflowDefinitionId: string): Promise<WorkflowTransition[]> {
  const data = await api.get<unknown[]>(
    `/administration/workflows/definitions/${workflowDefinitionId}/transitions`,
  );
  return toSnakeCase<WorkflowTransition[]>(data);
}

export async function createWorkflowTransition(insert: WorkflowTransitionInsert): Promise<WorkflowTransition> {
  const data = await api.post<unknown>('/administration/workflows/transitions', toCamelCase(insert));
  return toSnakeCase<WorkflowTransition>(data);
}

export async function updateWorkflowTransition(
  id: string,
  patch: WorkflowTransitionUpdate,
): Promise<WorkflowTransition> {
  const data = await api.patch<unknown>(`/administration/workflows/transitions/${id}`, toCamelCase(patch));
  return toSnakeCase<WorkflowTransition>(data);
}

export async function deleteWorkflowTransition(id: string): Promise<void> {
  await api.delete(`/administration/workflows/transitions/${id}`);
}

// --- Acteurs de transition ---

export async function listWorkflowActeurs(transitionId: string): Promise<WorkflowActeur[]> {
  const data = await api.get<unknown[]>(`/administration/workflows/transitions/${transitionId}/acteurs`);
  return toSnakeCase<WorkflowActeur[]>(data);
}

export async function createWorkflowActeur(insert: WorkflowActeurInsert): Promise<WorkflowActeur> {
  const data = await api.post<unknown>('/administration/workflows/acteurs', toCamelCase(insert));
  return toSnakeCase<WorkflowActeur>(data);
}

export async function deleteWorkflowActeur(id: string): Promise<void> {
  await api.delete(`/administration/workflows/acteurs/${id}`);
}

// --- Association définition <-> valeur de liste (ex. sens du courrier) ---

export async function listWorkflowDefinitionAssociations(
  workflowDefinitionId: string,
): Promise<WorkflowDefinitionAssociation[]> {
  const data = await api.get<unknown[]>(
    `/administration/workflows/definitions/${workflowDefinitionId}/associations`,
  );
  return toSnakeCase<WorkflowDefinitionAssociation[]>(data);
}

export async function creerAssociation(
  insert: WorkflowDefinitionAssociationInsert,
): Promise<WorkflowDefinitionAssociation> {
  const data = await api.post<unknown>('/administration/workflows/associations', toCamelCase(insert));
  return toSnakeCase<WorkflowDefinitionAssociation>(data);
}

export async function retirerAssociation(id: string): Promise<void> {
  await api.delete(`/administration/workflows/associations/${id}`);
}
