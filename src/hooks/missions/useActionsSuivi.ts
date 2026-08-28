import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  creerActionSuivi,
  listActionsSuivi,
  supprimerActionSuivi,
  updateActionSuivi,
  type MissionActionSuiviInsert,
  type MissionActionSuiviUpdate,
} from '../../services/missions/actionsSuivi';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useActionsSuiviMission(missionId: string | undefined) {
  return useQuery({
    queryKey: ['mission-actions-suivi', missionId],
    queryFn: () => listActionsSuivi(missionId!),
    enabled: Boolean(missionId),
  });
}

export function useActionSuiviMutations(missionId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mission-actions-suivi', missionId] });

  const creer = useMutation({
    mutationFn: (insert: MissionActionSuiviInsert) => creerActionSuivi(insert),
    onSuccess: () => {
      message.success('Action de suivi ajoutée.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MissionActionSuiviUpdate }) => updateActionSuivi(id, patch),
    onSuccess: () => {
      message.success('Action de suivi mise à jour.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const supprimer = useMutation({
    mutationFn: (id: string) => supprimerActionSuivi(id),
    onSuccess: () => {
      message.success('Action de suivi supprimée.');
      void invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cette action de suivi')),
  });

  return { creer, update, supprimer };
}
