import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  createMarcheCandidat,
  deleteMarcheCandidat,
  listMarcheCandidats,
  updateMarcheCandidat,
  type MarcheCandidatInsert,
  type MarcheCandidatUpdate,
} from '../../services/marches/candidats';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useMarcheCandidats(marcheId: string | undefined) {
  return useQuery({
    queryKey: ['marche-candidats', marcheId],
    queryFn: () => listMarcheCandidats(marcheId!),
    enabled: Boolean(marcheId),
  });
}

export function useMarcheCandidatMutations(marcheId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidateListe = () => queryClient.invalidateQueries({ queryKey: ['marche-candidats', marcheId] });

  const create = useMutation({
    mutationFn: (insert: Omit<MarcheCandidatInsert, 'marche_id'>) => createMarcheCandidat(marcheId!, insert),
    onSuccess: () => {
      message.success('Candidat ajouté.');
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MarcheCandidatUpdate }) =>
      updateMarcheCandidat(marcheId!, id, patch),
    onSuccess: () => {
      message.success('Candidat mis à jour.');
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMarcheCandidat(marcheId!, id),
    onSuccess: () => {
      message.success('Candidat supprimé.');
      void invalidateListe();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'ce candidat')),
  });

  return { create, update, remove };
}
