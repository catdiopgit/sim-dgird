const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// L'app ne dépend plus d'aucune configuration externe pour démarrer (Phase 8 :
// le backend NestJS a une URL par défaut valable en dev local) — contrairement
// à isSupabaseConfigured avant, qui bloquait le rendu tant que les clés
// Supabase n'étaient pas renseignées.
export const env = {
  apiUrl,
  appName: import.meta.env.VITE_APP_NAME || 'SIM',
  // Modules encore en rodage, cachés du menu et des routes sans toucher au
  // backend/aux données : pilotables par environnement via .env (VITE_*),
  // sans code à retoucher pour les ré-activer plus tard.
  missionsEnabled: import.meta.env.VITE_MISSIONS_ENABLED === 'true',
  marchesEnabled: import.meta.env.VITE_MARCHES_ENABLED !== 'false',
};
