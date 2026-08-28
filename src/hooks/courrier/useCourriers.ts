import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  creerCourrier,
  getCourrier,
  listBannetteCourriers,
  listCourriers,
  supprimerCourrier,
  updateCourrier,
  type Bannette,
  type CourrierFiltres,
  type CourrierPatchInfos,
  type CreerCourrierPayload,
} from '../../services/courrier/courriers';
import { fetchCourrierReferentiel } from '../../services/courrier/referentiel';

export function useCourriers(organisationId: string | undefined, filtres: CourrierFiltres = {}) {
  return useQuery({
    queryKey: ['courriers', organisationId, filtres],
    queryFn: () => listCourriers(organisationId!, filtres),
    enabled: Boolean(organisationId),
  });
}

export function useBannetteCourriers(bannette: Bannette | undefined) {
  return useQuery({
    queryKey: ['courriers-bannette', bannette],
    queryFn: () => listBannetteCourriers(bannette!),
    enabled: Boolean(bannette),
  });
}

export function useCourrier(id: string | undefined) {
  return useQuery({
    queryKey: ['courrier', id],
    queryFn: () => getCourrier(id!),
    enabled: Boolean(id),
  });
}

export function useCourrierReferentiel(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['courrier-referentiel', organisationId],
    queryFn: () => fetchCourrierReferentiel(organisationId!),
    enabled: Boolean(organisationId),
    staleTime: 5 * 60_000,
  });
}

export function useCreerCourrier(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreerCourrierPayload) => creerCourrier(payload),
    onSuccess: () => {
      message.success('Courrier créé.');
      void queryClient.invalidateQueries({ queryKey: ['courriers', organisationId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useUpdateCourrier(courrierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: CourrierPatchInfos) => updateCourrier(courrierId!, patch),
    onSuccess: () => {
      message.success('Courrier mis à jour.');
      void queryClient.invalidateQueries({ queryKey: ['courrier', courrierId] });
      void queryClient.invalidateQueries({ queryKey: ['courriers'] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useSupprimerCourrier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supprimerCourrier(id),
    onSuccess: () => {
      message.success('Courrier supprimé.');
      void queryClient.invalidateQueries({ queryKey: ['courriers'] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
