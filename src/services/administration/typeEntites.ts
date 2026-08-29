import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type TypeEntite = Database['public']['Tables']['type_entites']['Row'];
export type TypeEntiteInsert = Database['public']['Tables']['type_entites']['Insert'];
export type TypeEntiteUpdate = Database['public']['Tables']['type_entites']['Update'];

export async function listTypeEntites(organisationId: string): Promise<TypeEntite[]> {
  const data = await api.get<unknown[]>('/administration/entites/types', { organisationId });
  return toSnakeCase<TypeEntite[]>(data);
}

export async function createTypeEntite(insert: TypeEntiteInsert): Promise<TypeEntite> {
  const data = await api.post<unknown>('/administration/entites/types', toCamelCase(insert));
  return toSnakeCase<TypeEntite>(data);
}

// Pas de PATCH/DELETE côté backend pour type_entites (jamais utilisé côté SQL
// d'origine au-delà de la création — cf. server/administration/entites) :
// signatures conservées pour compatibilité de type mais lèvent explicitement
// si jamais appelées, plutôt que d'échouer silencieusement en 404.
export async function updateTypeEntite(_id: string, _patch: TypeEntiteUpdate): Promise<TypeEntite> {
  throw new Error('Modification des types d\'entité non prise en charge côté serveur.');
}

export async function deleteTypeEntite(_id: string): Promise<void> {
  throw new Error('Suppression des types d\'entité non prise en charge côté serveur.');
}
