import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from '../../lib/notifications';
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
    onSuccess: (contact) => {
      message.success('Contact créé.');
      // Ajout immédiat aux listes en cache : l'option existe dans les <select>
      // dès le rendu suivant, ce qui permet de la sélectionner aussitôt.
      queryClient.setQueriesData<unknown[]>({ queryKey: ['contacts', organisationId] }, (ancien) =>
        Array.isArray(ancien) && !ancien.some((c) => (c as { id: string }).id === contact.id) ? [...ancien, contact] : ancien,
      );
      void queryClient.invalidateQueries({ queryKey: ['contacts', organisationId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
