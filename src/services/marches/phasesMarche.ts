import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type PhaseMarche = Database['public']['Tables']['phases_marche']['Row'];

export type StatutCalculePhase =
  | 'a_venir'
  | 'en_cours'
  | 'en_retard'
  | 'realisee_a_temps'
  | 'realisee_avance'
  | 'realisee_retard';

export interface PhaseMarcheAvecStatut extends PhaseMarche {
  statut_calcule: StatutCalculePhase;
  ecart_jours: number | null;
}

export interface UpdatePhaseMarchePayload {
  date_debut_reelle?: string | null;
  date_fin_reelle?: string | null;
  observations?: string | null;
}

// §10/§11/§13 — server/marches/phases-marche.controller.ts.
export async function listPhasesMarche(marcheId: string): Promise<PhaseMarcheAvecStatut[]> {
  const data = await api.get<unknown[]>(`/marches/${marcheId}/phases`);
  return toSnakeCase<PhaseMarcheAvecStatut[]>(data);
}

// Idempotent : génère les phases depuis le type si aucune n'existe encore,
// sinon recalcule les dates prévisionnelles depuis la date de début du marché.
export async function planifierPhasesMarche(marcheId: string): Promise<PhaseMarcheAvecStatut[]> {
  const data = await api.post<unknown[]>(`/marches/${marcheId}/phases/planifier`);
  return toSnakeCase<PhaseMarcheAvecStatut[]>(data);
}

export async function updatePhaseMarche(
  marcheId: string,
  id: string,
  patch: UpdatePhaseMarchePayload,
): Promise<PhaseMarcheAvecStatut> {
  const data = await api.patch<unknown>(`/marches/${marcheId}/phases/${id}`, toCamelCase(patch));
  return toSnakeCase<PhaseMarcheAvecStatut>(data);
}

export async function demarrerPhaseMarche(marcheId: string, id: string): Promise<PhaseMarcheAvecStatut> {
  const data = await api.post<unknown>(`/marches/${marcheId}/phases/${id}/demarrer`);
  return toSnakeCase<PhaseMarcheAvecStatut>(data);
}

// §12 : échoue avec 400 si aucun document justificatif n'est associé à la
// phase — l'appelant doit avoir déjà proposé l'ajout du justificatif.
export async function validerPhaseMarche(marcheId: string, id: string): Promise<PhaseMarcheAvecStatut> {
  const data = await api.post<unknown>(`/marches/${marcheId}/phases/${id}/valider`);
  return toSnakeCase<PhaseMarcheAvecStatut>(data);
}
