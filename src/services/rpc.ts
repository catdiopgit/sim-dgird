import { supabase } from '../config/supabase';

// Le typage généré à la main (voir en-tête de src/types/database.ts) laisse
// `Functions: Record<string, never>`, donc supabase-js ne peut pas typer les
// appels RPC. On centralise le cast ici plutôt que de le répéter par service.
export async function callRpc<T>(nom: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = supabase as unknown as {
    rpc: (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: T; error: { message: string } | null }>;
  };
  const { data, error } = await client.rpc(nom, args);
  if (error) throw new Error(error.message);
  return data;
}
