import { useEffect } from 'react';
import { useAuth } from './useAuth';

// v8.6.6 — déconnexion automatique après une période sans activité (souris,
// clavier, défilement, toucher). Durée : VITE_INACTIVITE_MINUTES (30 par
// défaut). Le motif est affiché sur la page de connexion.
const MINUTES = Number(import.meta.env.VITE_INACTIVITE_MINUTES ?? 30) || 30;
export const CLE_MOTIF_DECONNEXION = 'sim_motif_deconnexion';

export function useDeconnexionInactivite(actif: boolean) {
  const { signOut } = useAuth();

  useEffect(() => {
    if (!actif) return;
    const delai = MINUTES * 60 * 1000;
    let derniere = Date.now();
    const activite = () => {
      derniere = Date.now();
    };
    const evenements = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;
    evenements.forEach((e) => window.addEventListener(e, activite, { passive: true }));
    const minuteur = window.setInterval(() => {
      if (Date.now() - derniere >= delai) {
        try {
          sessionStorage.setItem(CLE_MOTIF_DECONNEXION, `Session fermée après ${MINUTES} minutes d'inactivité.`);
        } catch {
          /* stockage indisponible : on se déconnecte quand même */
        }
        void signOut();
      }
    }, 30_000);
    return () => {
      evenements.forEach((e) => window.removeEventListener(e, activite));
      window.clearInterval(minuteur);
    };
  }, [actif, signOut]);
}
