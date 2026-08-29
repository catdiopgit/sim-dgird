import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  executerTransitionCourrier,
  getWorkflowInstance,
  imputerCourrier,
  listEntitesImputables,
  listEntitesTransmissibles,
  listHistoriqueActions,
  listPersonnesTransmissibles,
  listTransitionsDisponiblesCourrier,
  listWorkflowHistorique,
  type ImputerCourrierPayload,
} from '../../services/courrier/workflow';
import { listWorkflowEtapes } from '../../services/workflow/generique';

export function useWorkflowInstance(courrierId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-instance', courrierId],
    queryFn: () => getWorkflowInstance(courrierId!),
    enabled: Boolean(courrierId),
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

export function useWorkflowHistorique(courrierId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-historique', courrierId],
    queryFn: () => listWorkflowHistorique(courrierId!),
    enabled: Boolean(courrierId),
  });
}

export function useTransitionsDisponiblesCourrier(courrierId: string | undefined) {
  return useQuery({
    queryKey: ['transitions-disponibles', courrierId],
    queryFn: () => listTransitionsDisponiblesCourrier(courrierId!),
    enabled: Boolean(courrierId),
  });
}

export function useExecuterTransitionCourrier(courrierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transitionId, commentaire }: { transitionId: string; commentaire?: string }) =>
      executerTransitionCourrier(courrierId!, transitionId, commentaire),
    onSuccess: () => {
      message.success('Étape mise à jour.');
      void queryClient.invalidateQueries({ queryKey: ['courrier', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['courriers'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-instance', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-historique', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['transitions-disponibles', courrierId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useEntitesImputables() {
  return useQuery({
    queryKey: ['entites-imputables'],
    queryFn: () => listEntitesImputables(),
  });
}

export function useEntitesTransmissibles() {
  return useQuery({
    queryKey: ['entites-transmissibles'],
    queryFn: () => listEntitesTransmissibles(),
  });
}

export function usePersonnesTransmissibles() {
  return useQuery({
    queryKey: ['personnes-transmissibles'],
    queryFn: () => listPersonnesTransmissibles(),
  });
}

export function useHistoriqueActions(courrierId: string | undefined, workflowHistoriqueIds: string[]) {
  return useQuery({
    queryKey: ['historique-actions', courrierId, ...workflowHistoriqueIds],
    queryFn: () => listHistoriqueActions(courrierId!, workflowHistoriqueIds),
    enabled: Boolean(courrierId) && workflowHistoriqueIds.length > 0,
  });
}

export function useImputerCourrier(courrierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<ImputerCourrierPayload, 'p_courrier_id'>) =>
      imputerCourrier({ ...payload, p_courrier_id: courrierId! }),
    onSuccess: () => {
      message.success('Courrier imputé.');
      void queryClient.invalidateQueries({ queryKey: ['courrier', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['courriers'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-instance', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-historique', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['transitions-disponibles', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['destinataires', courrierId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
