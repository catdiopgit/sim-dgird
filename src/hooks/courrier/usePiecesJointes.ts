import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  listPiecesJointes,
  supprimerPieceJointe,
  uploadPieceJointe,
} from '../../services/courrier/piecesJointes';

export function usePiecesJointes(courrierId: string | undefined) {
  return useQuery({
    queryKey: ['pieces-jointes', courrierId],
    queryFn: () => listPiecesJointes(courrierId!),
    enabled: Boolean(courrierId),
  });
}

export function usePieceJointeMutations(courrierId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pieces-jointes', courrierId] });

  const upload = useMutation({
    mutationFn: ({ file, estScan }: { file: File; estScan: boolean }) =>
      uploadPieceJointe(courrierId!, file, estScan),
    onSuccess: () => {
      message.success('Pièce jointe ajoutée.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const supprimer = useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) =>
      supprimerPieceJointe(id, storagePath),
    onSuccess: () => {
      message.success('Pièce jointe supprimée.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  return { upload, supprimer };
}
