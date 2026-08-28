import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  createTypeEntite,
  deleteTypeEntite,
  listTypeEntites,
  updateTypeEntite,
  type TypeEntiteInsert,
  type TypeEntiteUpdate,
} from '../../services/administration/typeEntites';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useTypeEntites(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['type_entites', organisationId],
    queryFn: () => listTypeEntites(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useTypeEntiteMutations(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['type_entites', organisationId] });

  const create = useMutation({
    mutationFn: (insert: TypeEntiteInsert) => createTypeEntite(insert),
    onSuccess: () => {
      message.success('Type d\'entité créé.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TypeEntiteUpdate }) => updateTypeEntite(id, patch),
    onSuccess: () => {
      message.success('Type d\'entité mis à jour.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTypeEntite(id),
    onSuccess: () => {
      message.success('Type d\'entité supprimé.');
      void invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, "ce type d'entité")),
  });

  return { create, update, remove };
}
