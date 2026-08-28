import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  creerVersement,
  getVersement,
  listMesBrouillons,
  listVersements,
  modifierVersement,
  soumettreVersement,
  type CreerVersementPayload,
  type ModifierVersementPayload,
} from '../../services/ged/versements';

export function useVersements(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['ged-versements', organisationId],
    queryFn: () => listVersements(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useMesBrouillons(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['ged-brouillons', organisationId],
    queryFn: () => listMesBrouillons(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useVersement(id: string | undefined) {
  return useQuery({
    queryKey: ['ged-versement', id],
    queryFn: () => getVersement(id!),
    enabled: Boolean(id),
  });
}

export function useCreerVersement(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreerVersementPayload) => creerVersement(payload),
    onSuccess: () => {
      message.success('Versement créé en brouillon.');
      void queryClient.invalidateQueries({ queryKey: ['ged-versements', organisationId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-brouillons', organisationId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useModifierVersement(versementId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModifierVersementPayload) => modifierVersement(versementId!, payload),
    onSuccess: () => {
      message.success('Versement mis à jour.');
      void queryClient.invalidateQueries({ queryKey: ['ged-versement', versementId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-versements'] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useSoumettreVersement(versementId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => soumettreVersement(versementId!),
    onSuccess: () => {
      message.success('Versement soumis.');
      void queryClient.invalidateQueries({ queryKey: ['ged-versement', versementId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-versements'] });
      void queryClient.invalidateQueries({ queryKey: ['ged-brouillons'] });
      void queryClient.invalidateQueries({ queryKey: ['ged-bannette'] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
