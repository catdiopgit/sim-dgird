import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Delegation = Database['public']['Tables']['delegations']['Row'];
export type DelegationInsert = Database['public']['Tables']['delegations']['Insert'];

export async function listDelegations(organisationId: string): Promise<Delegation[]> {
  const data = await api.get<unknown[]>('/administration/delegations', { organisationId });
  return toSnakeCase<Delegation[]>(data);
}

export async function creerDelegation(insert: DelegationInsert): Promise<Delegation> {
  const data = await api.post<unknown>('/administration/delegations', toCamelCase(insert));
  return toSnakeCase<Delegation>(data);
}

export async function revoquerDelegation(id: string): Promise<Delegation> {
  const data = await api.post<unknown>(`/administration/delegations/${id}/revoquer`);
  return toSnakeCase<Delegation>(data);
}
