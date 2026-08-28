import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  createEntite,
  deleteEntite,
  listEntites,
  listUtilisateursOptions,
  updateEntite,
  type EntiteInsert,
  type EntiteUpdate,
} from '../../services/administration/entites';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useEntites(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['entites', organisationId],
    queryFn: () => listEntites(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useUtilisateursOptions(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['utilisateurs-options', organisationId],
    queryFn: () => listUtilisateursOptions(organisationId!),
    enabled: Boolean(organisationId),
    staleTime: 60_000,
  });
}

export function useEntiteMutations(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['entites', organisationId] });

  const create = useMutation({
    mutationFn: (insert: EntiteInsert) => createEntite(insert),
    onSuccess: () => {
      message.success('Entité créée.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EntiteUpdate }) => updateEntite(id, patch),
    onSuccess: () => {
      message.success('Entité mise à jour.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteEntite(id),
    onSuccess: () => {
      message.success('Entité supprimée.');
      void invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cette entité')),
  });

  return { create, update, remove };
}
