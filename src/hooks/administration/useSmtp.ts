import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  definirParametresSmtp,
  fetchParametresSmtp,
  type DefinirParametresSmtpPayload,
} from '../../services/administration/smtp';

export function useParametresSmtp(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['parametres-smtp', organisationId],
    queryFn: () => fetchParametresSmtp(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useDefinirParametresSmtp(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DefinirParametresSmtpPayload) => definirParametresSmtp(payload),
    onSuccess: () => {
      message.success('Configuration SMTP enregistrée.');
      void queryClient.invalidateQueries({ queryKey: ['parametres-smtp', organisationId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}
