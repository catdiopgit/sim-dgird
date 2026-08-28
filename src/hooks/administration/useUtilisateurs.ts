import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  assignerRole,
  creerUtilisateur,
  listUtilisateurRoles,
  listUtilisateurs,
  revoquerRole,
  updateUtilisateur,
  type CreerUtilisateurPayload,
  type UtilisateurRoleInsert,
  type UtilisateurUpdate,
} from '../../services/administration/utilisateurs';
import { listRoles } from '../../services/administration/roles';

export function useUtilisateurs(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['utilisateurs', organisationId],
    queryFn: () => listUtilisateurs(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useRoles(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['roles', organisationId],
    queryFn: () => listRoles(organisationId!),
    enabled: Boolean(organisationId),
    staleTime: 60_000,
  });
}

export function useUpdateUtilisateur(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UtilisateurUpdate }) => updateUtilisateur(id, patch),
    onSuccess: () => {
      message.success('Utilisateur mis à jour.');
      void queryClient.invalidateQueries({ queryKey: ['utilisateurs', organisationId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useCreerUtilisateur(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreerUtilisateurPayload) => creerUtilisateur(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['utilisateurs', organisationId] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useUtilisateurRoles(utilisateurId: string | undefined) {
  return useQuery({
    queryKey: ['utilisateur_roles', utilisateurId],
    queryFn: () => listUtilisateurRoles(utilisateurId!),
    enabled: Boolean(utilisateurId),
  });
}

export function useUtilisateurRoleMutations(utilisateurId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['utilisateur_roles', utilisateurId] });

  const assigner = useMutation({
    mutationFn: (insert: UtilisateurRoleInsert) => assignerRole(insert),
    onSuccess: () => {
      message.success('Rôle attribué.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const revoquer = useMutation({
    mutationFn: (id: string) => revoquerRole(id),
    onSuccess: () => {
      message.success('Rôle révoqué.');
      void invalidate();
    },
    onError: (error: Error) => message.error(error.message),
  });

  return { assigner, revoquer };
}
