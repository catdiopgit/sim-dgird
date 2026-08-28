import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  confirmerArchivage,
  definirSelectionElement,
  fetchArchivageCompteurs,
  fetchOperationEnPreparation,
  listArchivageElements,
  preparerArchivage,
} from '../../services/ged/archivage';

export function useArchivageCompteurs(dateDebut?: string, dateFin?: string) {
  return useQuery({
    queryKey: ['archivage-compteurs', dateDebut, dateFin],
    queryFn: () => fetchArchivageCompteurs(dateDebut, dateFin),
  });
}

export function useOperationEnPreparation(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['archivage-operation-en-preparation', organisationId],
    queryFn: () => fetchOperationEnPreparation(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useArchivageElements(operationId: string | undefined) {
  return useQuery({
    queryKey: ['archivage-elements', operationId],
    queryFn: () => listArchivageElements(operationId!),
    enabled: Boolean(operationId),
  });
}

export function useArchivageMutations(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidateOperation = () =>
    queryClient.invalidateQueries({ queryKey: ['archivage-operation-en-preparation', organisationId] });
  const invalidateCompteurs = () => queryClient.invalidateQueries({ queryKey: ['archivage-compteurs'] });

  const preparer = useMutation({
    mutationFn: ({ dateDebut, dateFin }: { dateDebut?: string; dateFin?: string }) =>
      preparerArchivage(dateDebut, dateFin),
    onSuccess: (operation) => {
      message.success(
        `Préparation lancée : ${operation.nombre_courriers} courrier(s), ${operation.nombre_projets} projet(s), ${operation.nombre_missions} mission(s) détecté(s).`,
      );
      void invalidateOperation();
      void invalidateCompteurs();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const definirSelection = useMutation({
    mutationFn: ({ elementId, selectionne }: { elementId: string; selectionne: boolean }) =>
      definirSelectionElement(elementId, selectionne),
    onSuccess: (element) => {
      void queryClient.invalidateQueries({ queryKey: ['archivage-elements', element.operation_id] });
    },
    onError: (error: Error) => message.error(error.message),
  });

  const confirmer = useMutation({
    mutationFn: (operationId: string) => confirmerArchivage(operationId),
    onSuccess: (operation) => {
      message.success('Archivage confirmé.');
      void invalidateOperation();
      void invalidateCompteurs();
      void queryClient.invalidateQueries({ queryKey: ['archivage-elements', operation.id] });
    },
    onError: (error: Error) => message.error(error.message),
  });

  return { preparer, definirSelection, confirmer };
}
