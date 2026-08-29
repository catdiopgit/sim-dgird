import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { ApiError, api, clearToken, getToken, setToken } from '../config/apiClient';

export interface AuthUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  organisationId: string;
  entiteId: string | null;
  statut: string;
}

interface AuthContextValue {
  session: { accessToken: string } | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const chargerUtilisateurCourant = useCallback(async () => {
    try {
      const { profile } = await api.get<{ profile: AuthUser }>('/auth/me');
      setUser(profile);
    } catch {
      clearToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void chargerUtilisateurCourant();
    } else {
      setLoading(false);
    }
  }, [token, chargerUtilisateurCourant]);

  useEffect(() => {
    const onUnauthorized = () => {
      setTokenState(null);
      setUser(null);
    };
    window.addEventListener('sim:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sim:unauthorized', onUnauthorized);
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    try {
      const { accessToken } = await api.post<{ accessToken: string }>('/auth/login', { email, password });
      setToken(accessToken);
      setTokenState(accessToken);
      await chargerUtilisateurCourant();
      return { error: null };
    } catch (error) {
      return { error: error instanceof ApiError ? error.message : 'Échec de la connexion.' };
    }
  };

  const signOut = async () => {
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  const value: AuthContextValue = {
    session: token ? { accessToken: token } : null,
    user,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
