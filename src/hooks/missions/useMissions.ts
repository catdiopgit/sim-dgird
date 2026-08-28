import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { fetchMissionsReferentiel } from '../../services/missions/referentiel';
import {
  creerMission,
  deleteMission,
  getMission,
  listMissions,
  updateMission,
  type CreerMissionInput,
  type MissionUpdate,
} from '../../services/missions/missions';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useMissions(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['missions', organisationId],
    queryFn: () => listMissions(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useMission(id: string | undefined) {
  return useQuery({
    queryKey: ['mission', id],
    queryFn: () => getMission(id!),
    enabled: Boolean(id),
  });
}

export function useMissionsReferentiel(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['missions-referentiel', organisationId],
    queryFn: () => fetchMissionsReferentiel(organisationId!),
    enabled: Boolean(organisationId),
    staleTime: 5 * 60_000,
  });
}

export function useMissionMutations(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidateListe = () => queryClient.invalidateQueries({ queryKey: ['missions', organisationId] });

  const create = useMutation({
    mutationFn: (input: CreerMissionInput) => creerMission(input),
    onSuccess: () => {
      message.success('Mission créée.');
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MissionUpdate }) => updateMission(id, patch),
    onSuccess: (_data, variables) => {
      message.success('Mission mise à jour.');
      void queryClient.invalidateQueries({ queryKey: ['mission', variables.id] });
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMission(id),
    onSuccess: () => {
      message.success('Mission supprimée.');
      void invalidateListe();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cette mission')),
  });

  return { create, update, remove };
}
