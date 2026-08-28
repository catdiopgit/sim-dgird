import { useQuery } from '@tanstack/react-query';
import {
  getWorkflowInstance,
  listWorkflowEtapes,
  listWorkflowHistorique,
} from '../../services/workflow/generique';

export function useWorkflowInstance(id: string | undefined) {
  return useQuery({
    queryKey: ['workflow-instance', id],
    queryFn: () => getWorkflowInstance(id!),
    enabled: Boolean(id),
  });
}

export function useWorkflowEtapes(workflowDefinitionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-etapes', workflowDefinitionId],
    queryFn: () => listWorkflowEtapes(workflowDefinitionId!),
    enabled: Boolean(workflowDefinitionId),
    staleTime: 5 * 60_000,
  });
}

export function useWorkflowHistorique(workflowInstanceId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-historique', workflowInstanceId],
    queryFn: () => listWorkflowHistorique(workflowInstanceId!),
    enabled: Boolean(workflowInstanceId),
  });
}
