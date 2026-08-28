import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
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

export async function listWorkflowDefinitions(
  organisationId: string,
  moduleId?: string,
): Promise<WorkflowDefinition[]> {
  let query = supabase.from('workflow_definitions').select('*').eq('organisation_id', organisationId);
  if (moduleId) query = query.eq('module_id', moduleId);
  const { data, error } = await query.order('code', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createWorkflowDefinition(insert: WorkflowDefinitionInsert): Promise<WorkflowDefinition> {
  const { data, error } = await supabase.from('workflow_definitions').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateWorkflowDefinition(
  id: string,
  patch: WorkflowDefinitionUpdate,
): Promise<WorkflowDefinition> {
  const { data, error } = await supabase
    .from('workflow_definitions')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkflowDefinition(id: string): Promise<void> {
  const { error } = await supabase.from('workflow_definitions').delete().eq('id', id);
  if (error) throw error;
}

// Bascule est_defaut de manière atomique (désactive l'ancien défaut du même
// module avant d'activer le nouveau) pour éviter la violation de
// idx_workflow_definitions_defaut.
export async function definirWorkflowDefinitionDefaut(id: string): Promise<WorkflowDefinition> {
  return callRpc<WorkflowDefinition>('fn_definir_workflow_defaut', { p_workflow_definition_id: id });
}

// --- Étapes ---

export async function listWorkflowEtapes(workflowDefinitionId: string): Promise<WorkflowEtape[]> {
  const { data, error } = await supabase
    .from('workflow_etapes')
    .select('*')
    .eq('workflow_definition_id', workflowDefinitionId)
    .order('ordre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createWorkflowEtape(insert: WorkflowEtapeInsert): Promise<WorkflowEtape> {
  const { data, error } = await supabase.from('workflow_etapes').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateWorkflowEtape(id: string, patch: WorkflowEtapeUpdate): Promise<WorkflowEtape> {
  const { data, error } = await supabase
    .from('workflow_etapes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkflowEtape(id: string): Promise<void> {
  const { error } = await supabase.from('workflow_etapes').delete().eq('id', id);
  if (error) throw error;
}

// --- Transitions ---

export async function listWorkflowTransitions(workflowDefinitionId: string): Promise<WorkflowTransition[]> {
  const { data, error } = await supabase
    .from('workflow_transitions')
    .select('*')
    .eq('workflow_definition_id', workflowDefinitionId);
  if (error) throw error;
  return data ?? [];
}

export async function createWorkflowTransition(insert: WorkflowTransitionInsert): Promise<WorkflowTransition> {
  const { data, error } = await supabase.from('workflow_transitions').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateWorkflowTransition(
  id: string,
  patch: WorkflowTransitionUpdate,
): Promise<WorkflowTransition> {
  const { data, error } = await supabase
    .from('workflow_transitions')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkflowTransition(id: string): Promise<void> {
  const { error } = await supabase.from('workflow_transitions').delete().eq('id', id);
  if (error) throw error;
}

// --- Acteurs de transition (workflow_transition_roles étendue, migration 0020) ---

export async function listWorkflowActeurs(transitionId: string): Promise<WorkflowActeur[]> {
  const { data, error } = await supabase
    .from('workflow_transition_roles')
    .select('*')
    .eq('workflow_transition_id', transitionId);
  if (error) throw error;
  return data ?? [];
}

export async function createWorkflowActeur(insert: WorkflowActeurInsert): Promise<WorkflowActeur> {
  const { data, error } = await supabase.from('workflow_transition_roles').insert(insert).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteWorkflowActeur(id: string): Promise<void> {
  const { error } = await supabase.from('workflow_transition_roles').delete().eq('id', id);
  if (error) throw error;
}

// --- Association définition <-> valeur de liste (ex. sens du courrier) ---

export async function listWorkflowDefinitionAssociations(
  workflowDefinitionId: string,
): Promise<WorkflowDefinitionAssociation[]> {
  const { data, error } = await supabase
    .from('workflow_definition_associations')
    .select('*')
    .eq('workflow_definition_id', workflowDefinitionId);
  if (error) throw error;
  return data ?? [];
}

export async function creerAssociation(
  insert: WorkflowDefinitionAssociationInsert,
): Promise<WorkflowDefinitionAssociation> {
  const { data, error } = await supabase
    .from('workflow_definition_associations')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function retirerAssociation(id: string): Promise<void> {
  const { error } = await supabase.from('workflow_definition_associations').delete().eq('id', id);
  if (error) throw error;
}
