import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { ajouterDechargeCourrier, deverrouillerCourrier } from '../../services/courrier/decharge';

export function useAjouterDecharge(courrierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => ajouterDechargeCourrier(courrierId!, file),
    onSuccess: () => {
      message.success('Décharge ajoutée — le courrier est désormais verrouillé.');
      void queryClient.invalidateQueries({ queryKey: ['courrier', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['courriers'] });
      void queryClient.invalidateQueries({ queryKey: ['pieces-jointes', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['audit-courrier', courrierId] });
      // Courrier départ + décharge = clôture du workflow côté serveur (0047/0048) —
      // sans ça le panneau Workflow reste affiché "en cours" jusqu'au prochain rechargement.
      void queryClient.invalidateQueries({ queryKey: ['workflow-instance'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-historique'] });
      void queryClient.invalidateQueries({ queryKey: ['transitions-disponibles', courrierId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useDeverrouillerCourrier(courrierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (motif: string) => deverrouillerCourrier(courrierId!, motif),
    onSuccess: () => {
      message.success('Courrier déverrouillé.');
      void queryClient.invalidateQueries({ queryKey: ['courrier', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['courriers'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-courrier', courrierId] });
      // Symétrique de l'ajout de décharge: le déverrouillage réveille l'instance
      // de workflow (0047) — même besoin de rafraîchir le panneau Workflow.
      void queryClient.invalidateQueries({ queryKey: ['workflow-instance'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-historique'] });
      void queryClient.invalidateQueries({ queryKey: ['transitions-disponibles', courrierId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
