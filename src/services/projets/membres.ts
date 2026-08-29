import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type ProjetMembre = Database['public']['Tables']['projet_membres']['Row'];
export type ProjetMembreInsert = Database['public']['Tables']['projet_membres']['Insert'];

export async function listMembresActifs(projetId: string): Promise<ProjetMembre[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/membres`);
  return toSnakeCase<ProjetMembre[]>(data);
}

export async function ajouterMembre(insert: ProjetMembreInsert): Promise<ProjetMembre> {
  const { projet_id, ...rest } = insert as ProjetMembreInsert & { projet_id: string };
  const data = await api.post<unknown>(`/projets/${projet_id}/membres`, toCamelCase(rest));
  return toSnakeCase<ProjetMembre>(data);
}

// Retrait = pose date_retrait côté serveur (ne supprime jamais la ligne,
// garde l'historique) — même sémantique que l'ancien update direct.
export async function retirerMembre(projetId: string, id: string): Promise<void> {
  await api.delete(`/projets/${projetId}/membres/${id}`);
}
