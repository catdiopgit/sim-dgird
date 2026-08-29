import { useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { createContext, useEffect, useMemo, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchProfileData, type ProfileData, type Profile } from '../services/profile';
import type { Database } from '../types/database';

type Portee = Database['public']['Enums']['portee_permission'];

interface ProfileContextValue {
  profile: Profile | null;
  rolesActifs: ProfileData['rolesActifs'];
  loading: boolean;
  // Aide UX pour masquer/désactiver des actions dans l'interface : ce n'est PAS
  // la barrière de sécurité. RLS (voir 0004_fonctions_permissions.sql /
  // app.has_permission) reste la seule source de vérité côté serveur.
  can: (moduleCode: string, actionCode: string, entiteId?: string | null) => boolean;
}

export const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

function estDescendantOuSoi(
  candidatId: string,
  ancetreId: string,
  parentParId: Map<string, string | null>,
): boolean {
  let courant: string | null = candidatId;
  const visites = new Set<string>();
  while (courant) {
    if (courant === ancetreId) return true;
    if (visites.has(courant)) return false;
    visites.add(courant);
    courant = parentParId.get(courant) ?? null;
  }
  return false;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfileData(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data && data.profile.statut !== 'actif') {
      message.error("Votre compte a été désactivé. Vous allez être déconnecté.");
      void signOut().then(() => {
        void queryClient.clear();
      });
    }
  }, [data, signOut, queryClient]);

  const value = useMemo<ProfileContextValue>(() => {
    const parentParId = new Map<string, string | null>(
      (data?.entites ?? []).map((e) => [e.id, e.parentEntiteId]),
    );

    const can = (moduleCode: string, actionCode: string, entiteId: string | null = null) => {
      if (!data) return false;
      return data.rolesActifs.some((ur) =>
        data.permissions.some((p) => {
          if (p.roleId !== ur.roleId || p.moduleCode !== moduleCode || p.actionCode !== actionCode) {
            return false;
          }
          return evaluerPortee(p.portee, ur.entiteId, entiteId, parentParId);
        }),
      );
    };

    return {
      profile: data?.profile ?? null,
      rolesActifs: data?.rolesActifs ?? [],
      loading: isLoading,
      can,
    };
  }, [data, isLoading]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

function evaluerPortee(
  portee: Portee,
  entiteAttribution: string | null,
  entiteCible: string | null,
  parentParId: Map<string, string | null>,
): boolean {
  if (portee === 'organisation' || portee === 'personnel') return true;
  if (!entiteCible || !entiteAttribution) return false;
  if (portee === 'entite') return entiteAttribution === entiteCible;
  // entite_et_descendants: entiteCible doit être l'entité d'attribution ou un de ses descendants.
  return estDescendantOuSoi(entiteCible, entiteAttribution, parentParId);
}
