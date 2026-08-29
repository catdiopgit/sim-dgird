const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// L'app ne dépend plus d'aucune configuration externe pour démarrer (Phase 8 :
// le backend NestJS a une URL par défaut valable en dev local) — contrairement
// à isSupabaseConfigured avant, qui bloquait le rendu tant que les clés
// Supabase n'étaient pas renseignées.
export const env = {
  apiUrl,
  appName: import.meta.env.VITE_APP_NAME || 'SIM',
};
