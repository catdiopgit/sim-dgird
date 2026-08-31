import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  cloturerMarche,
  createMarche,
  deleteMarche,
  getMarche,
  listMarches,
  updateMarche,
  verifierClotureMarche,
  type MarcheInsert,
  type MarcheUpdate,
} from '../../services/marches/marches';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useMarches() {
  return useQuery({ queryKey: ['marches'], queryFn: () => listMarches() });
}

export function useMarche(id: string | undefined) {
  return useQuery({
    queryKey: ['marche', id],
    queryFn: () => getMarche(id!),
    enabled: Boolean(id),
  });
}

export function useVerifierClotureMarche(id: string | undefined) {
  return useQuery({
    queryKey: ['marche-verifier-cloture', id],
    queryFn: () => verifierClotureMarche(id!),
    enabled: Boolean(id),
  });
}

export function useMarcheMutations() {
  const queryClient = useQueryClient();
  const invalidateListe = () => queryClient.invalidateQueries({ queryKey: ['marches'] });

  const create = useMutation({
    mutationFn: (insert: MarcheInsert) => createMarche(insert),
    onSuccess: () => {
      message.success('Marché créé.');
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MarcheUpdate }) => updateMarche(id, patch),
    onSuccess: (_data, variables) => {
      message.success('Marché mis à jour.');
      void queryClient.invalidateQueries({ queryKey: ['marche', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['phases-marche', variables.id] });
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMarche(id),
    onSuccess: () => {
      message.success('Marché supprimé.');
      void invalidateListe();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'ce marché')),
  });

  const cloturer = useMutation({
    mutationFn: (id: string) => cloturerMarche(id),
    onSuccess: (_data, id) => {
      message.success('Marché clôturé.');
      void queryClient.invalidateQueries({ queryKey: ['marche', id] });
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  return { create, update, remove, cloturer };
}
