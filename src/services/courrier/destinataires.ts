import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Destinataire = Database['public']['Tables']['courrier_destinataires']['Row'];
export type DestinataireInsert = Database['public']['Tables']['courrier_destinataires']['Insert'];

export async function listDestinataires(courrierId: string): Promise<Destinataire[]> {
  const data = await api.get<unknown[]>(`/courrier/courriers/${courrierId}/destinataires`);
  return toSnakeCase<Destinataire[]>(data);
}

export async function ajouterDestinataire(insert: DestinataireInsert): Promise<Destinataire> {
  const data = await api.post<unknown>('/courrier/destinataires', toCamelCase(insert));
  return toSnakeCase<Destinataire>(data);
}

export async function retirerDestinataire(id: string): Promise<void> {
  await api.delete(`/courrier/destinataires/${id}`);
}

export async function marquerPriseConnaissance(id: string): Promise<Destinataire> {
  const data = await api.post<unknown>(`/courrier/destinataires/${id}/prise-connaissance`);
  return toSnakeCase<Destinataire>(data);
}

// Actions demandées cochées pour un destinataire donné (fiche d'exploitation
// arrivée) — distincte de listHistoriqueActions (services/courrier/workflow.ts)
// qui recompose la timeline pour un ensemble de destinataires.
export async function listActionsDemandeesDestinataire(destinataireId: string): Promise<string[]> {
  return api.get<string[]>(`/courrier/destinataires/${destinataireId}/actions`);
}
