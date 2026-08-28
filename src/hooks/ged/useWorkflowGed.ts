import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { executerTransitionVersement, listTransitionsDisponiblesVersement } from '../../services/ged/workflow';

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
