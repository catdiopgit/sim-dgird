import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  createFonction,
  deleteFonction,
  listFonctions,
  updateFonction,
  type FonctionInsert,
  type FonctionUpdate,
} from '../../services/administration/fonctions';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useFonctions(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['fonctions', organisationId],
    queryFn: () => listFonctions(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useFonctionMutations(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fonctions', organisationId] });

  const create = useMutation({
    mutationFn: (insert: FonctionInsert) => createFonction(insert),
    onSuccess: () => {
      message.success('Fonction créée.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FonctionUpdate }) => updateFonction(id, patch),
    onSuccess: () => {
      message.success('Fonction mise à jour.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFonction(id),
    onSuccess: () => {
      message.success('Fonction supprimée.');
      void invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cette fonction')),
  });

  return { create, update, remove };
}
