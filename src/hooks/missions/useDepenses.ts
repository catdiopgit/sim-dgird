import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  creerDepenseAvecJustificatif,
  listDepenses,
  supprimerDepense,
  type MissionDepenseInsert,
} from '../../services/missions/depenses';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useDepensesMission(missionId: string | undefined) {
  return useQuery({
    queryKey: ['mission-depenses', missionId],
    queryFn: () => listDepenses(missionId!),
    enabled: Boolean(missionId),
  });
}

// La création d'une dépense recalcule budget_reel côté base (trigger) : on
// invalide aussi la mission elle-même.
export function useDepenseMutations(missionId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['mission-depenses', missionId] });
    void queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
  };

  const creer = useMutation({
    mutationFn: ({ insert, fichier, titreDocument }: { insert: MissionDepenseInsert; fichier: File; titreDocument: string }) =>
      creerDepenseAvecJustificatif(insert, fichier, titreDocument),
    onSuccess: () => {
      message.success('Dépense enregistrée.');
      invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const supprimer = useMutation({
    mutationFn: (id: string) => supprimerDepense(id),
    onSuccess: () => {
      message.success('Dépense supprimée.');
      invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'cette dépense')),
  });

  return { creer, supprimer };
}
