import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  definirVisibiliteEntites,
  definirVisibiliteUtilisateurs,
  listVisibiliteEntites,
  listVisibiliteUtilisateurs,
} from '../../services/projets/visibilite';

export function useVisibiliteEntites(projetId: string | undefined) {
  return useQuery({
    queryKey: ['projet-visibilite-entites', projetId],
    queryFn: () => listVisibiliteEntites(projetId!),
    enabled: Boolean(projetId),
  });
}

export function useVisibiliteUtilisateurs(projetId: string | undefined) {
  return useQuery({
    queryKey: ['projet-visibilite-utilisateurs', projetId],
    queryFn: () => listVisibiliteUtilisateurs(projetId!),
    enabled: Boolean(projetId),
  });
}

export function useVisibiliteMutations(projetId: string | undefined) {
  const queryClient = useQueryClient();

  const definirEntites = useMutation({
    mutationFn: (entiteIds: string[]) => definirVisibiliteEntites(projetId!, entiteIds),
    onSuccess: () => {
      message.success('Visibilité mise à jour.');
      void queryClient.invalidateQueries({ queryKey: ['projet-visibilite-entites', projetId] });
    },
    onError: (error: Error) => message.error(error.message),
  });

  const definirUtilisateurs = useMutation({
    mutationFn: (utilisateurIds: string[]) => definirVisibiliteUtilisateurs(projetId!, utilisateurIds),
    onSuccess: () => {
      message.success('Visibilité mise à jour.');
      void queryClient.invalidateQueries({ queryKey: ['projet-visibilite-utilisateurs', projetId] });
    },
    onError: (error: Error) => message.error(error.message),
  });

  return { definirEntites, definirUtilisateurs };
}
