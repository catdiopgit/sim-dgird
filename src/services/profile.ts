import { supabase } from '../config/supabase';
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

// Charge tout ce qu'il faut pour calculer les permissions côté client (aide UX,
// RLS reste la seule barrière de sécurité côté serveur — voir ProfileContext).
export async function fetchProfileData(userId: string): Promise<ProfileData> {
  const { data: profile, error: profileError } = await supabase
    .from('utilisateurs')
    .select('*')
    .eq('id', userId)
    .single();
  if (profileError) throw profileError;

  // Le typage généré à la main (voir en-tête de database.ts) ne modélise pas les
  // relations FK, donc supabase-js ne peut pas typer les select() imbriqués
  // (roles(code), modules(code)...). Ils fonctionnent bien à l'exécution
  // (PostgREST résout via les vraies FK) — on type juste la forme brute nous-mêmes.
  const today = new Date().toISOString().slice(0, 10);
  const { data: rolesRows, error: rolesError } = await supabase
    .from('utilisateur_roles')
    .select('role_id, entite_id, date_fin, roles(code)')
    .eq('utilisateur_id', userId)
    .or(`date_fin.is.null,date_fin.gte.${today}`);
  if (rolesError) throw rolesError;

  const rolesActifs: RoleActif[] = (
    (rolesRows ?? []) as unknown as Array<{
      role_id: string;
      entite_id: string | null;
      roles: { code: string } | null;
    }>
  ).map((r) => ({
    roleId: r.role_id,
    roleCode: r.roles?.code ?? '',
    entiteId: r.entite_id,
  }));

  const roleIds = [...new Set(rolesActifs.map((r) => r.roleId))];

  let permissions: PermissionRow[] = [];
  if (roleIds.length > 0) {
    const { data: permRows, error: permError } = await supabase
      .from('permissions')
      .select('role_id, portee, modules(code), actions(code)')
      .in('role_id', roleIds);
    if (permError) throw permError;
    permissions = (
      (permRows ?? []) as unknown as Array<{
        role_id: string;
        portee: Database['public']['Enums']['portee_permission'];
        modules: { code: string } | null;
        actions: { code: string } | null;
      }>
    ).map((p) => ({
      roleId: p.role_id,
      moduleCode: p.modules?.code ?? '',
      actionCode: p.actions?.code ?? '',
      portee: p.portee,
    }));
  }

  const { data: entiteRows, error: entiteError } = await supabase
    .from('entites')
    .select('id, parent_entite_id')
    .eq('organisation_id', profile.organisation_id);
  if (entiteError) throw entiteError;

  const entites: EntiteLite[] = (entiteRows ?? []).map((e) => ({
    id: e.id,
    parentEntiteId: e.parent_entite_id,
  }));

  return { profile, rolesActifs, permissions, entites };
}
