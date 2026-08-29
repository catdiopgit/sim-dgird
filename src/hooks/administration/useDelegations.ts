import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  creerDelegation,
  listDelegations,
  revoquerDelegation,
  type DelegationInsert,
} from '../../services/administration/delegations';

export function useDelegations(organisationId?: string) {
  return useQuery({
    queryKey: ['delegations', organisationId],
    queryFn: () => listDelegations(organisationId as string),
    enabled: !!organisationId,
  });
}

export function useDelegationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['delegations'] });

  const create = useMutation({
    mutationFn: (insert: DelegationInsert) => creerDelegation(insert),
    onSuccess: () => { message.success('Délégation créée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  const revoquer = useMutation({
    mutationFn: (id: string) => revoquerDelegation(id),
    onSuccess: () => { message.success('Délégation révoquée.'); void invalidate(); },
    onError: (error: Error) => message.error(error.message),
  });
  return { create, revoquer };
}
