// Adaptateur de casse entre le backend NestJS (entités TypeORM en camelCase,
// ex: entiteId, objetCourrier) et les types "Row" historiques du frontend
// (générés par introspection SQL, en snake_case, ex: entite_id) — voir
// MIGRATION.md Phase 8 : décision assumée de convertir à la frontière des
// services plutôt que de renommer chaque champ lu par ~200 composants qui ne
// touchent pas directement à supabase-js. N'agit que sur les CLÉS ; les
// valeurs (y compris des blobs jsonb) sont laissées intactes.
function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

export function toSnakeCase<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => toSnakeCase(v)) as unknown as T;
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[camelToSnakeKey(key)] = toSnakeCase(val);
    }
    return result as T;
  }
  return value as T;
}

export function toCamelCase<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => toCamelCase(v)) as unknown as T;
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[snakeToCamelKey(key)] = toCamelCase(val);
    }
    return result as T;
  }
  return value as T;
}
