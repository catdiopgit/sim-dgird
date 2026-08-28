import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  executerTransitionCourrier,
  imputerCourrier,
  listEntitesImputables,
  listEntitesTransmissibles,
  listHistoriqueActions,
  listPersonnesTransmissibles,
  listTransitionsDisponiblesCourrier,
  listWorkflowTransitionRoles,
  listWorkflowTransitions,
  type ImputerCourrierPayload,
} from '../../services/courrier/workflow';

// Instance/étapes/historique génériques: déplacés vers
// hooks/workflow/useWorkflowGenerique.ts (partagés avec GED), réexportés ici
// pour ne rien casser des imports existants côté Courrier.
export {
  useWorkflowInstance,
  useWorkflowEtapes,
  useWorkflowHistorique,
} from '../workflow/useWorkflowGenerique';

export function useWorkflowTransitions(workflowDefinitionId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-transitions', workflowDefinitionId],
    queryFn: () => listWorkflowTransitions(workflowDefinitionId!),
    enabled: Boolean(workflowDefinitionId),
    staleTime: 5 * 60_000,
  });
}

export function useWorkflowTransitionRoles(transitionIds: string[]) {
  return useQuery({
    queryKey: ['workflow-transition-roles', ...transitionIds],
    queryFn: () => listWorkflowTransitionRoles(transitionIds),
    enabled: transitionIds.length > 0,
    staleTime: 5 * 60_000,
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
      void queryClient.invalidateQueries({ queryKey: ['workflow-instance'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-historique'] });
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

export function useHistoriqueActions(workflowHistoriqueIds: string[]) {
  return useQuery({
    queryKey: ['historique-actions', ...workflowHistoriqueIds],
    queryFn: () => listHistoriqueActions(workflowHistoriqueIds),
    enabled: workflowHistoriqueIds.length > 0,
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
      void queryClient.invalidateQueries({ queryKey: ['workflow-instance'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-historique'] });
      void queryClient.invalidateQueries({ queryKey: ['transitions-disponibles', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['destinataires', courrierId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
