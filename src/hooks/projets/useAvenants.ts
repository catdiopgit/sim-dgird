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
    mutationFn: ({ id, patch }: { id: string; patch: AvenantUpdate }) => updateAvenant(projetId!, id, patch),
    onSuccess: () => {
      message.success('Avenant mis à jour.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAvenant(projetId!, id),
    onSuccess: () => {
      message.success('Avenant supprimé.');
      void invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cet avenant')),
  });

  return { create, update, remove };
}

export function useAvenantLivrables(projetId: string | undefined, avenantId: string | undefined) {
  return useQuery({
    queryKey: ['avenant-livrables', avenantId],
    queryFn: () => listAvenantLivrables(projetId!, avenantId!),
    enabled: Boolean(projetId) && Boolean(avenantId),
  });
}

export function useAvenantLivrableMutations(projetId: string | undefined, avenantId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['avenant-livrables', avenantId] });

  const ajouter = useMutation({
    mutationFn: (insert: AvenantLivrableInsert) => ajouterAvenantLivrable(projetId!, insert),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });

  const retirer = useMutation({
    mutationFn: (id: string) => retirerAvenantLivrable(projetId!, id),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });

  const definir = useMutation({
    mutationFn: (entrees: AvenantLivrableEntree[]) => definirAvenantLivrables(projetId!, avenantId!, entrees),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });

  return { ajouter, retirer, definir };
}
