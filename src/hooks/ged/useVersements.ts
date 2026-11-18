import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from '../../lib/notifications';
import {
  creerVersement,
  getVersement,
  listMesBrouillons,
  listVersements,
  modifierVersement,
  soumettreVersement,
  annulerVersement,
  classerVersement,
  listDoublonsVersement,
  retirerDocumentVersement,
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

// v8.6 : brouillons et doublons.
export function useRetirerDocumentVersement(versementId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => retirerDocumentVersement(versementId!, documentId),
    onSuccess: () => {
      message.success('Document retiré du versement.');
      void queryClient.invalidateQueries({ queryKey: ['ged-documents-versement', versementId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-doublons', versementId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useAnnulerVersement(versementId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => annulerVersement(versementId!),
    onSuccess: () => {
      message.success('Brouillon annulé.');
      void queryClient.invalidateQueries({ queryKey: ['ged-versements'] });
      void queryClient.invalidateQueries({ queryKey: ['ged-brouillons'] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useDoublonsVersement(versementId: string | undefined, actif = true) {
  return useQuery({
    queryKey: ['ged-doublons', versementId],
    queryFn: () => listDoublonsVersement(versementId!),
    enabled: Boolean(versementId) && actif,
  });
}

export function useClasserVersement(versementId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { codeArchivage: string; dossierParentId: string }) => classerVersement(versementId!, payload),
    onSuccess: () => {
      message.success('Versement classé : ses documents sont rangés dans son dossier.');
      void queryClient.invalidateQueries({ queryKey: ['ged-versement', versementId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-documents-versement', versementId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-dossiers'] });
      void queryClient.invalidateQueries({ queryKey: ['ged-workflow-transitions', versementId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
