import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  createRole,
  deleteRole,
  updateRole,
  type RoleInsert,
  type RoleUpdate,
} from '../../services/administration/roles';
import {
  createPermission,
  deletePermission,
  listActions,
  listModules,
  listPermissionsForRole,
  updatePermissionPortee,
  type PermissionInsert,
  type Portee,
} from '../../services/administration/permissions';
import { messageErreurSuppression } from '../../utils/supabaseErrors';

export function useRoleMutations(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['roles', organisationId] });

  const create = useMutation({
    mutationFn: (insert: RoleInsert) => createRole(insert),
    onSuccess: () => {
      message.success('Rôle créé.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RoleUpdate }) => updateRole(id, patch),
    onSuccess: () => {
      message.success('Rôle mis à jour.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      message.success('Rôle supprimé.');
      void invalidate();
    },
    onError: (error: unknown) => message.error(messageErreurSuppression(error, 'ce rôle')),
  });

  return { create, update, remove };
}

export function useModulesActions() {
  const modules = useQuery({ queryKey: ['modules'], queryFn: listModules, staleTime: 5 * 60_000 });
  const actions = useQuery({ queryKey: ['actions'], queryFn: listActions, staleTime: 5 * 60_000 });
  return { modules, actions };
}

export function usePermissionsForRole(roleId: string | undefined) {
  return useQuery({
    queryKey: ['permissions', roleId],
    queryFn: () => listPermissionsForRole(roleId!),
    enabled: Boolean(roleId),
  });
}

export function usePermissionMutations(roleId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['permissions', roleId] });

  const accorder = useMutation({
    mutationFn: (insert: PermissionInsert) => createPermission(insert),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });

  const changerPortee = useMutation({
    mutationFn: ({ id, portee }: { id: string; portee: Portee }) => updatePermissionPortee(id, portee),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });

  const retirer = useMutation({
    mutationFn: (id: string) => deletePermission(id),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => message.error(error.message),
  });

  return { accorder, changerPortee, retirer };
}
