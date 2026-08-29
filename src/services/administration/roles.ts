import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Role = Database['public']['Tables']['roles']['Row'];
export type RoleInsert = Database['public']['Tables']['roles']['Insert'];
export type RoleUpdate = Database['public']['Tables']['roles']['Update'];

export async function listRoles(organisationId: string): Promise<Role[]> {
  const data = await api.get<unknown[]>('/administration/roles', { organisationId });
  return toSnakeCase<Role[]>(data);
}

export async function createRole(insert: RoleInsert): Promise<Role> {
  const data = await api.post<unknown>('/administration/roles', toCamelCase(insert));
  return toSnakeCase<Role>(data);
}

export async function updateRole(id: string, patch: RoleUpdate): Promise<Role> {
  const data = await api.patch<unknown>(`/administration/roles/${id}`, toCamelCase(patch));
  return toSnakeCase<Role>(data);
}

export async function deleteRole(id: string): Promise<void> {
  await api.delete(`/administration/roles/${id}`);
}
