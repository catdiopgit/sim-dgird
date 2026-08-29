import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  cloturerLivrable,
  createLivrable,
  deleteLivrable,
  listLivrables,
  updateLivrable,
  type LivrableInsert,
  type LivrableUpdate,
} from '../../services/projets/livrables';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useLivrables(projetId: string | undefined) {
  return useQuery({
    queryKey: ['livrables', projetId],
    queryFn: () => listLivrables(projetId!),
    enabled: Boolean(projetId),
  });
}

export function useCloturerLivrable(projetId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statutCode }: { id: string; statutCode?: 'realise' | 'valide' }) =>
      cloturerLivrable(projetId!, id, statutCode),
    onSuccess: () => {
      message.success('Livrable clôturé.');
      void queryClient.invalidateQueries({ queryKey: ['livrables', projetId] });
      void queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
      void queryClient.invalidateQueries({ queryKey: ['cloture-checklist', projetId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useLivrableMutations(projetId: string | undefined) {
  const queryClient = useQueryClient();
  // La suppression/modification d'un livrable (poids, statut) change aussi
  // l'avancement du projet (recalculé côté serveur par trigger) : on
  // invalide systématiquement ['projet', projetId] en plus de la liste.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['livrables', projetId] });
    void queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
  };

  const create = useMutation({
    mutationFn: (insert: LivrableInsert) => createLivrable(insert),
    onSuccess: () => {
      message.success('Livrable créé.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LivrableUpdate }) => updateLivrable(projetId!, id, patch),
    onSuccess: () => {
      message.success('Livrable mis à jour.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLivrable(projetId!, id),
    onSuccess: () => {
      message.success('Livrable supprimé.');
      invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'ce livrable')),
  });

  return { create, update, remove };
}
