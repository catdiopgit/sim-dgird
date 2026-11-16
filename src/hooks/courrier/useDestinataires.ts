import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from '../../lib/notifications';
import {
  ajouterDestinataire,
  listActionsDemandeesDestinataire,
  listDestinataires,
  marquerPriseConnaissance,
  priseConnaissanceCourrier,
  retirerDestinataire,
  type DestinataireInsert,
} from '../../services/courrier/destinataires';

export function useDestinataires(courrierId: string | undefined) {
  return useQuery({
    queryKey: ['destinataires', courrierId],
    queryFn: () => listDestinataires(courrierId!),
    enabled: Boolean(courrierId),
  });
}

export function useActionsDemandeesDestinataire(destinataireId: string | undefined) {
  return useQuery({
    queryKey: ['actions-demandees-destinataire', destinataireId],
    queryFn: () => listActionsDemandeesDestinataire(destinataireId!),
    enabled: Boolean(destinataireId),
  });
}

export function useDestinataireMutations(courrierId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['destinataires', courrierId] });

  const ajouter = useMutation({
    mutationFn: (insert: DestinataireInsert) => ajouterDestinataire(insert),
    onSuccess: () => {
      message.success('Destinataire ajouté.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const retirer = useMutation({
    mutationFn: (id: string) => retirerDestinataire(id),
    onSuccess: () => {
      message.success('Destinataire retiré.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const marquerLu = useMutation({
    mutationFn: (id: string) => marquerPriseConnaissance(id),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });

  return { ajouter, retirer, marquerLu };
}

export function usePriseConnaissanceCourrier(courrierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => priseConnaissanceCourrier(courrierId!),
    onSuccess: () => {
      message.success('Prise de connaissance enregistrée.');
      // Toutes les requêtes liées à ce courrier, plus les listes, bannettes et
      // notifications (le compteur « Pour information » change).
      void queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey.includes(courrierId) ||
          ['courriers', 'courriers-bannette', 'mes-notifications'].includes(String(q.queryKey[0])),
        refetchType: 'all',
      });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
