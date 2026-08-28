import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { env, isSupabaseConfigured } from './env';

// En l'absence de configuration, on pointe vers une URL valide mais inerte :
// createClient() valide l'URL de façon synchrone, et App.tsx bloque le rendu
// tant que isSupabaseConfigured est faux, donc ce client n'est jamais sollicité.
export const supabase = createClient<Database>(
  isSupabaseConfigured ? env.supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? env.supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
