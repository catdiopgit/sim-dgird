import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Decaissement = Database['public']['Tables']['decaissements']['Row'];
export type DecaissementInsert = Database['public']['Tables']['decaissements']['Insert'];
export type DecaissementUpdate = Database['public']['Tables']['decaissements']['Update'];

export async function listDecaissements(projetId: string): Promise<Decaissement[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/decaissements`);
  return toSnakeCase<Decaissement[]>(data);
}

// §5 Le justificatif est obligatoire : un seul appel multipart côté backend
// (server/projets/decaissements.service.ts, creerAvecJustificatif) — compose
// déjà la création du décaissement + le dépôt du document, avec rollback
// automatique si l'upload échoue.
export async function creerDecaissementAvecJustificatif(
  insert: DecaissementInsert,
  fichier: File,
  titreDocument: string,
): Promise<Decaissement> {
  const { projet_id, avenant_id, pourcentage, montant, date_decaissement, observations } = insert as DecaissementInsert & {
    projet_id: string;
  };
  const formData = new FormData();
  formData.append('file', fichier);
  formData.append('titreDocument', titreDocument);
  formData.append('pourcentage', String(pourcentage));
  formData.append('montant', String(montant));
  if (avenant_id) formData.append('avenantId', avenant_id);
  if (date_decaissement) formData.append('dateDecaissement', date_decaissement);
  if (observations) formData.append('observations', observations);
  const data = await api.upload<unknown>(`/projets/${projet_id}/decaissements`, formData);
  return toSnakeCase<Decaissement>(data);
}

export async function updateDecaissement(
  projetId: string,
  id: string,
  patch: DecaissementUpdate,
): Promise<Decaissement> {
  const data = await api.patch<unknown>(`/projets/${projetId}/decaissements/${id}`, toCamelCase(patch));
  return toSnakeCase<Decaissement>(data);
}

export async function deleteDecaissement(projetId: string, id: string): Promise<void> {
  await api.delete(`/projets/${projetId}/decaissements/${id}`);
}
