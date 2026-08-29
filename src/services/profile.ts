import { api } from '../config/apiClient';
import { toSnakeCase } from '../utils/caseMapping';
import type { Database } from '../types/database';

export type Profile = Database['public']['Tables']['utilisateurs']['Row'];
export type RoleActif = {
  roleId: string;
  roleCode: string;
  entiteId: string | null;
};
type PermissionRow = {
  roleId: string;
  moduleCode: string;
  actionCode: string;
  portee: Database['public']['Enums']['portee_permission'];
};
type EntiteLite = { id: string; parentEntiteId: string | null };

export interface ProfileData {
  profile: Profile;
  rolesActifs: RoleActif[];
  permissions: PermissionRow[];
  entites: EntiteLite[];
}

// Remplace les 4 requêtes PostgREST par un seul appel à GET /auth/me
// (server/auth/profile.service.ts) — mêmes données (roles actifs, permissions
// à plat, entités de l'organisation), mêmes clés côté sortie (rolesActifs
// etc. restent en camelCase, cf. ProfileContext qui les consomme tel quel).
export async function fetchProfileData(): Promise<ProfileData> {
  const data = await api.get<{
    profile: unknown;
    rolesActifs: RoleActif[];
    permissions: PermissionRow[];
    entites: EntiteLite[];
  }>('/auth/me');

  return {
    profile: toSnakeCase<Profile>(data.profile),
    rolesActifs: data.rolesActifs,
    permissions: data.permissions,
    entites: data.entites,
  };
}
