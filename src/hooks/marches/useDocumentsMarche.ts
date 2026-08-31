import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  ajouterDocumentMarcheAvecFichier,
  listDocumentsMarche,
  listDocumentsMarcheCandidat,
  listDocumentsPhaseMarche,
  type AjouterDocumentMarchePayload,
} from '../../services/marches/documents';

export function useDocumentsMarche(marcheId: string | undefined) {
  return useQuery({
    queryKey: ['documents-marche', marcheId],
    queryFn: () => listDocumentsMarche(marcheId!),
    enabled: Boolean(marcheId),
  });
}

export function useDocumentsPhaseMarche(phaseMarcheId: string | undefined) {
  return useQuery({
    queryKey: ['documents-phase-marche', phaseMarcheId],
    queryFn: () => listDocumentsPhaseMarche(phaseMarcheId!),
    enabled: Boolean(phaseMarcheId),
  });
}

export function useDocumentsMarcheCandidat(marcheCandidatId: string | undefined) {
  return useQuery({
    queryKey: ['documents-marche-candidat', marcheCandidatId],
    queryFn: () => listDocumentsMarcheCandidat(marcheCandidatId!),
    enabled: Boolean(marcheCandidatId),
  });
}

export function useAjouterDocumentMarcheMutation(marcheId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, fichier }: { payload: Omit<AjouterDocumentMarchePayload, 'marche_id'>; fichier: File }) =>
      ajouterDocumentMarcheAvecFichier({ marche_id: marcheId!, ...payload }, fichier),
    onSuccess: (_document, variables) => {
      message.success('Document ajouté.');
      void queryClient.invalidateQueries({ queryKey: ['documents-marche', marcheId] });
      if (variables.payload.phase_marche_id) {
        void queryClient.invalidateQueries({ queryKey: ['documents-phase-marche', variables.payload.phase_marche_id] });
      }
      if (variables.payload.marche_candidat_id) {
        void queryClient.invalidateQueries({
          queryKey: ['documents-marche-candidat', variables.payload.marche_candidat_id],
        });
      }
    },
    onError: (error: Error) => message.error(error.message),
  });
}
