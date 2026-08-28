import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { fetchProjetsReferentiel } from '../../services/projets/referentiel';
import {
  createProjet,
  deleteProjet,
  getProjet,
  listProjets,
  updateProjet,
  type ProjetInsert,
  type ProjetUpdate,
} from '../../services/projets/projets';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useProjets(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['projets', organisationId],
    queryFn: () => listProjets(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useProjet(id: string | undefined) {
  return useQuery({
    queryKey: ['projet', id],
    queryFn: () => getProjet(id!),
    enabled: Boolean(id),
  });
}

export function useProjetsReferentiel(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['projets-referentiel', organisationId],
    queryFn: () => fetchProjetsReferentiel(organisationId!),
    enabled: Boolean(organisationId),
    staleTime: 5 * 60_000,
  });
}

export function useProjetMutations(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidateListe = () => queryClient.invalidateQueries({ queryKey: ['projets', organisationId] });

  const create = useMutation({
    mutationFn: (insert: ProjetInsert) => createProjet(insert),
    onSuccess: () => {
      message.success('Projet créé.');
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProjetUpdate }) => updateProjet(id, patch),
    onSuccess: (_data, variables) => {
      message.success('Projet mis à jour.');
      void queryClient.invalidateQueries({ queryKey: ['projet', variables.id] });
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProjet(id),
    onSuccess: () => {
      message.success('Projet supprimé.');
      void invalidateListe();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'ce projet')),
  });

  return { create, update, remove };
}
