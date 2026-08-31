import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  demarrerPhaseMarche,
  listPhasesMarche,
  planifierPhasesMarche,
  updatePhaseMarche,
  validerPhaseMarche,
  type UpdatePhaseMarchePayload,
} from '../../services/marches/phasesMarche';

export function usePhasesMarche(marcheId: string | undefined) {
  return useQuery({
    queryKey: ['phases-marche', marcheId],
    queryFn: () => listPhasesMarche(marcheId!),
    enabled: Boolean(marcheId),
  });
}

export function usePhaseMarcheMutations(marcheId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['phases-marche', marcheId] });
    void queryClient.invalidateQueries({ queryKey: ['marche', marcheId] });
  };

  const planifier = useMutation({
    mutationFn: () => planifierPhasesMarche(marcheId!),
    onSuccess: () => {
      message.success('Planification générée.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdatePhaseMarchePayload }) =>
      updatePhaseMarche(marcheId!, id, patch),
    onSuccess: () => {
      message.success('Phase mise à jour.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const demarrer = useMutation({
    mutationFn: (id: string) => demarrerPhaseMarche(marcheId!, id),
    onSuccess: () => {
      message.success('Phase démarrée.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const valider = useMutation({
    mutationFn: (id: string) => validerPhaseMarche(marcheId!, id),
    onSuccess: () => {
      message.success('Phase validée.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  return { planifier, update, demarrer, valider };
}
