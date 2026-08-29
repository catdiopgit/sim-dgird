import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Livrable = Database['public']['Tables']['livrables']['Row'];
export type LivrableInsert = Database['public']['Tables']['livrables']['Insert'];
export type LivrableUpdate = Database['public']['Tables']['livrables']['Update'];

// §3 Règle obligatoire : seule voie pour passer un livrable à "réalisé"/
// "validé" — vérifie côté serveur qu'au moins un document justificatif est associé.
export async function cloturerLivrable(
  projetId: string,
  livrableId: string,
  statutCode: 'realise' | 'valide' = 'realise',
): Promise<Livrable> {
  const data = await api.post<unknown>(`/projets/${projetId}/livrables/${livrableId}/cloturer`, { statutCode });
  return toSnakeCase<Livrable>(data);
}

export async function listLivrables(projetId: string): Promise<Livrable[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/livrables`);
  return toSnakeCase<Livrable[]>(data);
}

export async function createLivrable(insert: LivrableInsert): Promise<Livrable> {
  const { projet_id, ...rest } = insert as LivrableInsert & { projet_id: string };
  const data = await api.post<unknown>(`/projets/${projet_id}/livrables`, toCamelCase(rest));
  return toSnakeCase<Livrable>(data);
}

export async function updateLivrable(projetId: string, id: string, patch: LivrableUpdate): Promise<Livrable> {
  const data = await api.patch<unknown>(`/projets/${projetId}/livrables/${id}`, toCamelCase(patch));
  return toSnakeCase<Livrable>(data);
}

export async function deleteLivrable(projetId: string, id: string): Promise<void> {
  await api.delete(`/projets/${projetId}/livrables/${id}`);
}
