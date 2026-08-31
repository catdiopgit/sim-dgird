import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type MarcheAttribution = Database['public']['Tables']['marche_attributions']['Row'];

export interface EnregistrerAttributionPayload {
  candidat_attributaire_id: string;
  montant_attribue?: number | null;
  date_attribution?: string | null;
  observations?: string | null;
}

// §16 — un seul enregistrement par marché (server/marches/marche-attributions.controller.ts).
export async function getMarcheAttribution(marcheId: string): Promise<MarcheAttribution | null> {
  const data = await api.get<unknown | null>(`/marches/${marcheId}/attribution`);
  return data ? toSnakeCase<MarcheAttribution>(data) : null;
}

export async function enregistrerMarcheAttribution(
  marcheId: string,
  payload: EnregistrerAttributionPayload,
): Promise<MarcheAttribution> {
  const data = await api.put<unknown>(`/marches/${marcheId}/attribution`, toCamelCase(payload));
  return toSnakeCase<MarcheAttribution>(data);
}
