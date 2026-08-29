import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useMemo } from 'react';
import {
  ajouterDocumentAvecFichier,
  classerDocument,
  getDocument,
  listDocumentsVersement,
  listInfosFichierDocuments,
  listVersions,
  modifierDocument,
  verserVersion,
  type AjouterDocumentVersementPayload,
  type ClasserDocumentPayload,
  type ModifierDocumentPayload,
} from '../../services/ged/documents';
import { telechargerFichier } from '../../config/apiClient';

export function useDocumentsVersement(versementId: string | undefined) {
  return useQuery({
    queryKey: ['ged-documents-versement', versementId],
    queryFn: () => listDocumentsVersement(versementId!),
    enabled: Boolean(versementId),
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['ged-document', id],
    queryFn: () => getDocument(id!),
    enabled: Boolean(id),
  });
}

// Jointe côté client les infos de fichier (nom réel, type MIME, taille,
// chemin de stockage) des versions courantes d'une liste de documents — pour
// les cartes de l'explorateur Archives.
export function useInfosFichierDocuments(
  documents: { id: string; version_courante_id: string | null }[] | undefined,
) {
  const docIds = useMemo(() => (documents ?? []).map((d) => d.id).sort().join(','), [documents]);
  const requete = useQuery({
    queryKey: ['ged-infos-fichier-documents', docIds],
    queryFn: () => listInfosFichierDocuments(documents ?? []),
    enabled: (documents ?? []).length > 0,
  });
  const infosParVersionId = useMemo(() => new Map((requete.data ?? []).map((v) => [v.id, v])), [requete.data]);
  return { ...requete, infosParVersionId };
}

export function useVersionsDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: ['ged-document-versions', documentId],
    queryFn: () => listVersions(documentId!),
    enabled: Boolean(documentId),
  });
}

export function useAjouterDocumentVersement(versementId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, fichier }: { payload: AjouterDocumentVersementPayload; fichier: File }) =>
      ajouterDocumentAvecFichier(payload, fichier),
    onSuccess: () => {
      message.success('Document ajouté au versement.');
      void queryClient.invalidateQueries({ queryKey: ['ged-documents-versement', versementId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useVerserVersion(documentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fichier, commentaire }: { fichier: File; commentaire?: string }) =>
      verserVersion(documentId!, fichier, commentaire),
    onSuccess: () => {
      message.success('Nouvelle version versée.');
      void queryClient.invalidateQueries({ queryKey: ['ged-document-versions', documentId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-document', documentId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-documents-versement'] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useModifierDocument(documentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModifierDocumentPayload) => modifierDocument(documentId!, payload),
    onSuccess: () => {
      message.success('Document mis à jour.');
      void queryClient.invalidateQueries({ queryKey: ['ged-document', documentId] });
      void queryClient.invalidateQueries({ queryKey: ['ged-documents-versement'] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useClasserDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClasserDocumentPayload) => classerDocument(payload),
    onSuccess: (document) => {
      message.success('Document classé.');
      void queryClient.invalidateQueries({ queryKey: ['ged-document', document.id] });
      void queryClient.invalidateQueries({ queryKey: ['ged-documents-versement', document.versement_id] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

// Le téléchargement est tracé automatiquement côté serveur (GedStorageService.telecharger).
export async function telechargerVersion(_documentId: string, versionId: string, nomFichier: string): Promise<void> {
  await telechargerFichier(`/ged/versions/${versionId}/telecharger`, nomFichier);
}
