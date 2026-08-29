import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database, Json } from '../../types/database';

export type ListeValeurs = Database['public']['Tables']['listes_valeurs']['Row'];
export type ListeValeursInsert = Database['public']['Tables']['listes_valeurs']['Insert'];
export type ListeValeursUpdate = Database['public']['Tables']['listes_valeurs']['Update'];
export type ValeurListe = Database['public']['Tables']['valeurs_listes']['Row'];
export type ValeurListeInsert = Database['public']['Tables']['valeurs_listes']['Insert'];
export type ValeurListeUpdate = Database['public']['Tables']['valeurs_listes']['Update'];
export type RegleNumerotation = Database['public']['Tables']['regles_numerotation']['Row'];
export type RegleNumerotationInsert = Database['public']['Tables']['regles_numerotation']['Insert'];
export type RegleNumerotationUpdate = Database['public']['Tables']['regles_numerotation']['Update'];
export type ParametreOrganisation = Database['public']['Tables']['parametres_organisation']['Row'];

// --- Listes de valeurs (référentiel générique) ---

export async function listListesValeurs(organisationId: string): Promise<ListeValeurs[]> {
  const data = await api.get<unknown[]>('/administration/parametrage/listes', { organisationId });
  return toSnakeCase<ListeValeurs[]>(data);
}

export async function createListeValeurs(insert: ListeValeursInsert): Promise<ListeValeurs> {
  const data = await api.post<unknown>('/administration/parametrage/listes', toCamelCase(insert));
  return toSnakeCase<ListeValeurs>(data);
}

export async function updateListeValeurs(id: string, patch: ListeValeursUpdate): Promise<ListeValeurs> {
  const data = await api.patch<unknown>(`/administration/parametrage/listes/${id}`, toCamelCase(patch));
  return toSnakeCase<ListeValeurs>(data);
}

export async function deleteListeValeurs(id: string): Promise<void> {
  await api.delete(`/administration/parametrage/listes/${id}`);
}

export async function listValeursListes(listeId: string): Promise<ValeurListe[]> {
  const data = await api.get<unknown[]>(`/administration/parametrage/listes/${listeId}/valeurs`);
  return toSnakeCase<ValeurListe[]>(data);
}

export async function createValeurListe(insert: ValeurListeInsert): Promise<ValeurListe> {
  const { liste_id, ...rest } = insert as ValeurListeInsert & { liste_id: string };
  const data = await api.post<unknown>(
    `/administration/parametrage/listes/${liste_id}/valeurs`,
    toCamelCase(rest),
  );
  return toSnakeCase<ValeurListe>(data);
}

export async function updateValeurListe(id: string, patch: ValeurListeUpdate): Promise<ValeurListe> {
  const data = await api.patch<unknown>(`/administration/parametrage/valeurs/${id}`, toCamelCase(patch));
  return toSnakeCase<ValeurListe>(data);
}

export async function deleteValeurListe(id: string): Promise<void> {
  await api.delete(`/administration/parametrage/valeurs/${id}`);
}

// --- Règles de numérotation ---

export async function listReglesNumerotation(organisationId: string): Promise<RegleNumerotation[]> {
  const data = await api.get<unknown[]>('/administration/parametrage/numerotation', { organisationId });
  return toSnakeCase<RegleNumerotation[]>(data);
}

export async function upsertRegleNumerotation(payload: Record<string, unknown>): Promise<RegleNumerotation> {
  const data = await api.post<unknown>('/administration/parametrage/numerotation', toCamelCase(payload));
  return toSnakeCase<RegleNumerotation>(data);
}

export async function createRegleNumerotation(insert: RegleNumerotationInsert): Promise<RegleNumerotation> {
  const data = await api.post<unknown>('/administration/parametrage/numerotation', toCamelCase(insert));
  return toSnakeCase<RegleNumerotation>(data);
}

export async function updateRegleNumerotation(
  id: string,
  patch: RegleNumerotationUpdate,
): Promise<RegleNumerotation> {
  const data = await api.post<unknown>('/administration/parametrage/numerotation', {
    id,
    ...toCamelCase<Record<string, unknown>>(patch),
  });
  return toSnakeCase<RegleNumerotation>(data);
}

export async function deleteRegleNumerotation(id: string): Promise<void> {
  await api.delete(`/administration/parametrage/numerotation/${id}`);
}

// --- Paramètres organisation (clé/valeur) ---
// Portés sous /administration/organisations/:id/parametres (server/administration/organisations),
// pas sous /administration/parametrage — voir organisations.ts.

export async function listParametresOrganisation(organisationId: string): Promise<ParametreOrganisation[]> {
  const data = await api.get<unknown[]>(`/administration/organisations/${organisationId}/parametres`);
  return toSnakeCase<ParametreOrganisation[]>(data);
}

export async function upsertParametreOrganisation(
  organisationId: string,
  cle: string,
  valeur: Json,
  description: string | null,
): Promise<ParametreOrganisation> {
  const data = await api.post<unknown>(`/administration/organisations/${organisationId}/parametres`, {
    cle,
    valeur,
    description,
  });
  return toSnakeCase<ParametreOrganisation>(data);
}

export async function deleteParametreOrganisation(id: string): Promise<void> {
  await api.delete(`/administration/organisations/parametres/${id}`);
}
