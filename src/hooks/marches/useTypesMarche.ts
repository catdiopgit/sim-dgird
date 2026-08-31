import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  createPhaseTypeMarche,
  createTypeMarche,
  deletePhaseTypeMarche,
  deleteTypeMarche,
  listPhasesTypeMarche,
  listTypesMarche,
  updatePhaseTypeMarche,
  updateTypeMarche,
  type PhaseTypeMarcheInsert,
  type PhaseTypeMarcheUpdate,
  type TypeMarcheInsert,
  type TypeMarcheUpdate,
} from '../../services/marches/typesMarche';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useTypesMarche() {
  return useQuery({ queryKey: ['types-marche'], queryFn: () => listTypesMarche() });
}

export function useTypeMarcheMutations() {
  const queryClient = useQueryClient();
  const invalidateListe = () => queryClient.invalidateQueries({ queryKey: ['types-marche'] });

  const create = useMutation({
    mutationFn: (insert: TypeMarcheInsert) => createTypeMarche(insert),
    onSuccess: () => {
      message.success('Type de marché créé.');
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TypeMarcheUpdate }) => updateTypeMarche(id, patch),
    onSuccess: () => {
      message.success('Type de marché mis à jour.');
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTypeMarche(id),
    onSuccess: () => {
      message.success('Type de marché supprimé.');
      void invalidateListe();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'ce type de marché')),
  });

  return { create, update, remove };
}

export function usePhasesTypeMarche(typeMarcheId: string | undefined) {
  return useQuery({
    queryKey: ['phases-type-marche', typeMarcheId],
    queryFn: () => listPhasesTypeMarche(typeMarcheId!),
    enabled: Boolean(typeMarcheId),
  });
}

export function usePhaseTypeMarcheMutations(typeMarcheId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidateListe = () => queryClient.invalidateQueries({ queryKey: ['phases-type-marche', typeMarcheId] });

  const create = useMutation({
    mutationFn: (insert: Omit<PhaseTypeMarcheInsert, 'type_marche_id'>) => createPhaseTypeMarche(typeMarcheId!, insert),
    onSuccess: () => {
      message.success('Phase ajoutée au type de marché.');
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PhaseTypeMarcheUpdate }) =>
      updatePhaseTypeMarche(typeMarcheId!, id, patch),
    onSuccess: () => {
      message.success('Phase mise à jour.');
      void invalidateListe();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePhaseTypeMarche(typeMarcheId!, id),
    onSuccess: () => {
      message.success('Phase supprimée.');
      void invalidateListe();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cette phase')),
  });

  return { create, update, remove };
}
