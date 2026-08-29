import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  executerTransitionVersement,
  getWorkflowInstance,
  listTransitionsDisponiblesVersement,
  listWorkflowHistorique,
} from '../../services/ged/workflow';
import { listWorkflowEtapes } from '../../services/workflow/generique';

export function useWorkflowInstance(versementId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-instance', versementId],
    queryFn: () => getWorkflowInstance(versementId!),
    enabled: Boolean(versementId),
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

export function useWorkflowHistorique(versementId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-historique', versementId],
    queryFn: () => listWorkflowHistorique(versementId!),
    enabled: Boolean(versementId),
  });
}

export function useTransitionsDisponiblesVersement(versementId: string | undefined) {
  return useQuery({
    queryKey: ['ged-transitions-disponibles', versementId],
    queryFn: () => listTransitionsDisponiblesVersement(versementId!),
    enabled: Boolean(versementId),
  });
}

export function useExecuterTransitionVersement(versementId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transitionId, commentaire }: { transitionId: string; commentaire?: string }) =>
      executerTransitionVersement(versementId!, transitionId, commentaire),
    onSuccess: () => {
      message.success('Étape mise à jour.');
      void queryClient.invalidateQueries({ queryKey: ['ged-versement', versementId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-versements'] });
      void queryClient.invalidateQueries({ queryKey: ['ged-brouillons'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-instance'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-historique'] });
      void queryClient.invalidateQueries({ queryKey: ['ged-transitions-disponibles', versementId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-bannette'] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
