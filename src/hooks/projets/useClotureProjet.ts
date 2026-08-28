import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { confirmerCloture, demanderCloture, rejeterCloture, verifierCloture } from '../../services/projets/cloture';

export function useVerifierCloture(projetId: string | undefined) {
  return useQuery({
    queryKey: ['cloture-checklist', projetId],
    queryFn: () => verifierCloture(projetId!),
    enabled: Boolean(projetId),
  });
}

export function useClotureMutations(projetId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
    void queryClient.invalidateQueries({ queryKey: ['cloture-checklist', projetId] });
    void queryClient.invalidateQueries({ queryKey: ['historique-projet', projetId] });
  };

  const demander = useMutation({
    mutationFn: () => demanderCloture(projetId!),
    onSuccess: () => {
      message.success('Clôture demandée.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const confirmer = useMutation({
    mutationFn: (commentaire?: string) => confirmerCloture(projetId!, commentaire),
    onSuccess: () => {
      message.success('Clôture confirmée : le projet est désormais en lecture seule.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const rejeter = useMutation({
    mutationFn: (motif: string) => rejeterCloture(projetId!, motif),
    onSuccess: () => {
      message.success('Demande de clôture rejetée.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  return { demander, confirmer, rejeter };
}
