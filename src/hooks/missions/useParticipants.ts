import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  ajouterParticipant,
  listParticipants,
  retirerParticipant,
  type MissionParticipantInsert,
} from '../../services/missions/participants';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useParticipantsMission(missionId: string | undefined) {
  return useQuery({
    queryKey: ['mission-participants', missionId],
    queryFn: () => listParticipants(missionId!),
    enabled: Boolean(missionId),
  });
}

export function useParticipantMutations(missionId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mission-participants', missionId] });

  const ajouter = useMutation({
    mutationFn: (insert: MissionParticipantInsert) => ajouterParticipant(insert),
    onSuccess: () => {
      message.success('Participant ajouté.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const retirer = useMutation({
    mutationFn: (id: string) => retirerParticipant(id),
    onSuccess: () => {
      message.success('Participant retiré.');
      void invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'ce participant')),
  });

  return { ajouter, retirer };
}
