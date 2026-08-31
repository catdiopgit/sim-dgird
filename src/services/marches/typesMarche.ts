import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type TypeMarche = Database['public']['Tables']['types_marche']['Row'];
export type TypeMarcheInsert = Database['public']['Tables']['types_marche']['Insert'];
export type TypeMarcheUpdate = Database['public']['Tables']['types_marche']['Update'];

export type PhaseTypeMarche = Database['public']['Tables']['phases_type_marche']['Row'];
export type PhaseTypeMarcheInsert = Database['public']['Tables']['phases_type_marche']['Insert'];
export type PhaseTypeMarcheUpdate = Database['public']['Tables']['phases_type_marche']['Update'];

// §7 Paramétrage — administration système, réservé à la permission
// marches/modifier (server/marches/types-marche.controller.ts).
export async function listTypesMarche(): Promise<TypeMarche[]> {
  const data = await api.get<unknown[]>('/marches/types');
  return toSnakeCase<TypeMarche[]>(data);
}

export async function createTypeMarche(insert: TypeMarcheInsert): Promise<TypeMarche> {
  const data = await api.post<unknown>('/marches/types', toCamelCase(insert));
  return toSnakeCase<TypeMarche>(data);
}

export async function updateTypeMarche(id: string, patch: TypeMarcheUpdate): Promise<TypeMarche> {
  const data = await api.patch<unknown>(`/marches/types/${id}`, toCamelCase(patch));
  return toSnakeCase<TypeMarche>(data);
}

export async function deleteTypeMarche(id: string): Promise<void> {
  await api.delete(`/marches/types/${id}`);
}

export async function listPhasesTypeMarche(typeMarcheId: string): Promise<PhaseTypeMarche[]> {
  const data = await api.get<unknown[]>(`/marches/types/${typeMarcheId}/phases`);
  return toSnakeCase<PhaseTypeMarche[]>(data);
}

export async function createPhaseTypeMarche(
  typeMarcheId: string,
  insert: Omit<PhaseTypeMarcheInsert, 'type_marche_id'>,
): Promise<PhaseTypeMarche> {
  const data = await api.post<unknown>(`/marches/types/${typeMarcheId}/phases`, toCamelCase(insert));
  return toSnakeCase<PhaseTypeMarche>(data);
}

export async function updatePhaseTypeMarche(
  typeMarcheId: string,
  id: string,
  patch: PhaseTypeMarcheUpdate,
): Promise<PhaseTypeMarche> {
  const data = await api.patch<unknown>(`/marches/types/${typeMarcheId}/phases/${id}`, toCamelCase(patch));
  return toSnakeCase<PhaseTypeMarche>(data);
}

export async function deletePhaseTypeMarche(typeMarcheId: string, id: string): Promise<void> {
  await api.delete(`/marches/types/${typeMarcheId}/phases/${id}`);
}
