import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  ajouterContactExecution,
  listContactsExecution,
  supprimerContactExecution,
  type ContactExecutionInsert,
} from '../../services/projets/contactsExecution';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useContactsExecution(projetId: string | undefined) {
  return useQuery({
    queryKey: ['contacts-execution', projetId],
    queryFn: () => listContactsExecution(projetId!),
    enabled: Boolean(projetId),
  });
}

export function useContactExecutionMutations(projetId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contacts-execution', projetId] });

  const create = useMutation({
    mutationFn: (insert: ContactExecutionInsert) => ajouterContactExecution(insert),
    onSuccess: () => {
      message.success('Contact ajouté.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => supprimerContactExecution(projetId!, id),
    onSuccess: () => {
      message.success('Contact supprimé.');
      void invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'ce contact')),
  });

  return { create, remove };
}
