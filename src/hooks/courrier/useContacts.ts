import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { creerContact, listContacts, type ContactInsert } from '../../services/courrier/contacts';

export function useContacts(organisationId: string | undefined, recherche?: string) {
  return useQuery({
    queryKey: ['contacts', organisationId, recherche ?? ''],
    queryFn: () => listContacts(organisationId!, recherche),
    enabled: Boolean(organisationId),
  });
}

export function useCreerContact(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (insert: Omit<ContactInsert, 'organisation_id'>) =>
      creerContact({ ...insert, organisation_id: organisationId! }),
    onSuccess: () => {
      message.success('Contact créé.');
      void queryClient.invalidateQueries({ queryKey: ['contacts', organisationId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
