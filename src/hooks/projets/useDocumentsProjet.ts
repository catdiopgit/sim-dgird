import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  ajouterDocumentProjetAvecFichier,
  listDocumentsLivrable,
  listDocumentsProjet,
  type AjouterDocumentProjetPayload,
} from '../../services/projets/documents';

export function useDocumentsProjet(projetId: string | undefined) {
  return useQuery({
    queryKey: ['documents-projet', projetId],
    queryFn: () => listDocumentsProjet(projetId!),
    enabled: Boolean(projetId),
  });
}

export function useDocumentsLivrable(livrableId: string | undefined) {
  return useQuery({
    queryKey: ['documents-livrable', livrableId],
    queryFn: () => listDocumentsLivrable(livrableId!),
    enabled: Boolean(livrableId),
  });
}

export function useAjouterDocumentProjet(projetId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, fichier }: { payload: AjouterDocumentProjetPayload; fichier: File }) =>
      ajouterDocumentProjetAvecFichier(payload, fichier),
    onSuccess: (_document, variables) => {
      message.success('Document ajouté.');
      void queryClient.invalidateQueries({ queryKey: ['documents-projet', projetId] });
      if (variables.payload.p_livrable_id) {
        void queryClient.invalidateQueries({ queryKey: ['documents-livrable', variables.payload.p_livrable_id] });
      }
      void queryClient.invalidateQueries({ queryKey: ['cloture-checklist', projetId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
