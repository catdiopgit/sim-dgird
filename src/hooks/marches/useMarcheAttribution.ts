import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  enregistrerMarcheAttribution,
  getMarcheAttribution,
  type EnregistrerAttributionPayload,
} from '../../services/marches/attribution';

export function useMarcheAttribution(marcheId: string | undefined) {
  return useQuery({
    queryKey: ['marche-attribution', marcheId],
    queryFn: () => getMarcheAttribution(marcheId!),
    enabled: Boolean(marcheId),
  });
}

export function useMarcheAttributionMutation(marcheId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EnregistrerAttributionPayload) => enregistrerMarcheAttribution(marcheId!, payload),
    onSuccess: () => {
      message.success('Attribution enregistrée.');
      void queryClient.invalidateQueries({ queryKey: ['marche-attribution', marcheId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
