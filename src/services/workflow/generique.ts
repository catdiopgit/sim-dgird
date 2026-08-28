import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

// Requêtes sur les tables génériques du moteur de workflow
// (workflow_instances/workflow_etapes/workflow_historique), sans rien de
// spécifique à un module — utilisées par Courrier et GED (et Missions à
// l'avenir) via la même instance/étape/historique par id.
export type WorkflowInstance = Database['public']['Tables']['workflow_instances']['Row'];
export type WorkflowEtape = Database['public']['Tables']['workflow_etapes']['Row'];
export type WorkflowHistoriqueEntree = Database['public']['Tables']['workflow_historique']['Row'];

export async function getWorkflowInstance(id: string): Promise<WorkflowInstance> {
  const { data, error } = await supabase.from('workflow_instances').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function listWorkflowEtapes(workflowDefinitionId: string): Promise<WorkflowEtape[]> {
  const { data, error } = await supabase
    .from('workflow_etapes')
    .select('*')
    .eq('workflow_definition_id', workflowDefinitionId)
    .order('ordre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listWorkflowHistorique(workflowInstanceId: string): Promise<WorkflowHistoriqueEntree[]> {
  const { data, error } = await supabase
    .from('workflow_historique')
    .select('*')
    .eq('workflow_instance_id', workflowInstanceId)
    .order('date_action', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
