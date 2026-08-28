import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { ajouterDocumentMissionAvecFichier, type AjouterDocumentMissionPayload } from '../../services/missions/documents';

export function useAjouterDocumentMission(missionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, fichier }: { payload: AjouterDocumentMissionPayload; fichier: File }) =>
      ajouterDocumentMissionAvecFichier(payload, fichier),
    onSuccess: () => {
      message.success('Document ajouté.');
      void queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
      void queryClient.invalidateQueries({ queryKey: ['mission-depenses', missionId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
