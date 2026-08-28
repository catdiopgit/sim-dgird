import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  ajouterAvenantLivrable,
  createAvenant,
  definirAvenantLivrables,
  deleteAvenant,
  listAvenantLivrables,
  listAvenants,
  retirerAvenantLivrable,
  updateAvenant,
  type AvenantInsert,
  type AvenantLivrableEntree,
  type AvenantLivrableInsert,
  type AvenantUpdate,
} from '../../services/projets/avenants';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useAvenants(projetId: string | undefined) {
  return useQuery({
    queryKey: ['avenants', projetId],
    queryFn: () => listAvenants(projetId!),
    enabled: Boolean(projetId),
  });
}

export function useAvenantMutations(projetId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['avenants', projetId] });

  const create = useMutation({
    mutationFn: (insert: AvenantInsert) => createAvenant(insert),
    onSuccess: () => {
      message.success('Avenant créé.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AvenantUpdate }) => updateAvenant(id, patch),
    onSuccess: () => {
      message.success('Avenant mis à jour.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAvenant(id),
    onSuccess: () => {
      message.success('Avenant supprimé.');
      void invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cet avenant')),
  });

  return { create, update, remove };
}

export function useAvenantLivrables(avenantId: string | undefined) {
  return useQuery({
    queryKey: ['avenant-livrables', avenantId],
    queryFn: () => listAvenantLivrables(avenantId!),
    enabled: Boolean(avenantId),
  });
}

export function useAvenantLivrableMutations(avenantId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['avenant-livrables', avenantId] });

  const ajouter = useMutation({
    mutationFn: (insert: AvenantLivrableInsert) => ajouterAvenantLivrable(insert),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });

  const retirer = useMutation({
    mutationFn: (id: string) => retirerAvenantLivrable(id),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });

  const definir = useMutation({
    mutationFn: (entrees: AvenantLivrableEntree[]) => definirAvenantLivrables(avenantId!, entrees),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });

  return { ajouter, retirer, definir };
}
