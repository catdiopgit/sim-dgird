import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  listDroitsDocument,
  listDroitsDossier,
  octroyerDroitDocument,
  octroyerDroitDossier,
  revoquerDroitDocument,
  revoquerDroitDossier,
  type OctroyerDroitPayload,
} from '../../services/ged/droits';

export function useDroitsDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: ['ged-droits-document', documentId],
    queryFn: () => listDroitsDocument(documentId!),
    enabled: Boolean(documentId),
  });
}

export function useOctroyerDroitDocument(documentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OctroyerDroitPayload) => octroyerDroitDocument(documentId!, payload),
    onSuccess: () => {
      message.success('Droit accordé.');
      void queryClient.invalidateQueries({ queryKey: ['ged-droits-document', documentId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useRevoquerDroitDocument(documentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (droitId: string) => revoquerDroitDocument(droitId),
    onSuccess: () => {
      message.success('Droit révoqué.');
      void queryClient.invalidateQueries({ queryKey: ['ged-droits-document', documentId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useDroitsDossier(dossierId: string | undefined) {
  return useQuery({
    queryKey: ['ged-droits-dossier', dossierId],
    queryFn: () => listDroitsDossier(dossierId!),
    enabled: Boolean(dossierId),
  });
}

export function useOctroyerDroitDossier(dossierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OctroyerDroitPayload) => octroyerDroitDossier(dossierId!, payload),
    onSuccess: () => {
      message.success('Droit accordé.');
      void queryClient.invalidateQueries({ queryKey: ['ged-droits-dossier', dossierId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useRevoquerDroitDossier(dossierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (droitId: string) => revoquerDroitDossier(droitId),
    onSuccess: () => {
      message.success('Droit révoqué.');
      void queryClient.invalidateQueries({ queryKey: ['ged-droits-dossier', dossierId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
