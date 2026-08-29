import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  creerDecaissementAvecJustificatif,
  deleteDecaissement,
  listDecaissements,
  updateDecaissement,
  type DecaissementInsert,
  type DecaissementUpdate,
} from '../../services/projets/decaissements';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useDecaissements(projetId: string | undefined) {
  return useQuery({
    queryKey: ['decaissements', projetId],
    queryFn: () => listDecaissements(projetId!),
    enabled: Boolean(projetId),
  });
}

// La création d'un décaissement change le solde restant à décaisser (dérivé
// du budget du projet) : on invalide aussi le projet et ses documents (le
// justificatif y apparaît également, via l'espace documentaire commun).
export function useDecaissementMutations(projetId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['decaissements', projetId] });
    void queryClient.invalidateQueries({ queryKey: ['projet', projetId] });
    void queryClient.invalidateQueries({ queryKey: ['documents-projet', projetId] });
  };

  const create = useMutation({
    mutationFn: ({ insert, fichier, titreDocument }: { insert: DecaissementInsert; fichier: File; titreDocument: string }) =>
      creerDecaissementAvecJustificatif(insert, fichier, titreDocument),
    onSuccess: () => {
      message.success('Décaissement enregistré.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DecaissementUpdate }) =>
      updateDecaissement(projetId!, id, patch),
    onSuccess: () => {
      message.success('Décaissement mis à jour.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDecaissement(projetId!, id),
    onSuccess: () => {
      message.success('Décaissement supprimé.');
      invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'ce décaissement')),
  });

  return { create, update, remove };
}
