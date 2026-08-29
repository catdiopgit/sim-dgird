import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  executerTransitionMission,
  getWorkflowInstance,
  listTransitionsDisponiblesMission,
  listWorkflowHistorique,
} from '../../services/missions/workflow';
import { listWorkflowEtapes } from '../../services/workflow/generique';

export function useWorkflowInstance(missionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-instance', missionId],
    queryFn: () => getWorkflowInstance(missionId!),
    enabled: Boolean(missionId),
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

export function useWorkflowHistorique(missionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-historique', missionId],
    queryFn: () => listWorkflowHistorique(missionId!),
    enabled: Boolean(missionId),
  });
}

export function useTransitionsDisponiblesMission(missionId: string | undefined) {
  return useQuery({
    queryKey: ['mission-transitions-disponibles', missionId],
    queryFn: () => listTransitionsDisponiblesMission(missionId!),
    enabled: Boolean(missionId),
  });
}

export function useExecuterTransitionMission(missionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transitionId, commentaire }: { transitionId: string; commentaire?: string }) =>
      executerTransitionMission(missionId!, transitionId, commentaire),
    onSuccess: () => {
      message.success('Étape mise à jour.');
      void queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
      void queryClient.invalidateQueries({ queryKey: ['missions'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-instance'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-historique'] });
      void queryClient.invalidateQueries({ queryKey: ['mission-transitions-disponibles', missionId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
