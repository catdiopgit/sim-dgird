import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type ModuleRef = Database['public']['Tables']['modules']['Row'];
export type ActionRef = Database['public']['Tables']['actions']['Row'];
export type Permission = Database['public']['Tables']['permissions']['Row'];
export type PermissionInsert = Database['public']['Tables']['permissions']['Insert'];
export type Portee = Database['public']['Enums']['portee_permission'];

export async function listModules(): Promise<ModuleRef[]> {
  const data = await api.get<unknown[]>('/administration/permissions/modules');
  return toSnakeCase<ModuleRef[]>(data);
}

export async function listActions(): Promise<ActionRef[]> {
  const data = await api.get<unknown[]>('/administration/permissions/actions');
  return toSnakeCase<ActionRef[]>(data);
}

export async function listPermissionsForRole(roleId: string): Promise<Permission[]> {
  const data = await api.get<unknown[]>('/administration/permissions', { roleId });
  return toSnakeCase<Permission[]>(data);
}

export async function createPermission(insert: PermissionInsert): Promise<Permission> {
  const data = await api.post<unknown>('/administration/permissions', {
    roleId: insert.role_id,
    moduleId: insert.module_id,
    actionId: insert.action_id,
    portee: insert.portee,
  });
  return toSnakeCase<Permission>(data);
}

export async function updatePermissionPortee(id: string, portee: Portee): Promise<Permission> {
  const data = await api.patch<unknown>(`/administration/permissions/${id}`, { portee });
  return toSnakeCase<Permission>(data);
}

export async function deletePermission(id: string): Promise<void> {
  await api.delete(`/administration/permissions/${id}`);
}
