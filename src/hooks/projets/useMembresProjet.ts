import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  ajouterMembre,
  listMembresActifs,
  retirerMembre,
  type ProjetMembreInsert,
} from '../../services/projets/membres';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useMembresProjet(projetId: string | undefined) {
  return useQuery({
    queryKey: ['projet-membres', projetId],
    queryFn: () => listMembresActifs(projetId!),
    enabled: Boolean(projetId),
  });
}

export function useMembreMutations(projetId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['projet-membres', projetId] });

  const ajouter = useMutation({
    mutationFn: (insert: ProjetMembreInsert) => ajouterMembre(insert),
    onSuccess: () => {
      message.success('Membre ajouté.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const retirer = useMutation({
    mutationFn: (id: string) => retirerMembre(projetId!, id),
    onSuccess: () => {
      message.success('Membre retiré.');
      void invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'ce membre')),
  });

  return { ajouter, retirer };
}
