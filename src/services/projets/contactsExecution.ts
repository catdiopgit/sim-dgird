import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type ContactExecution = Database['public']['Tables']['projet_contacts_execution']['Row'];
export type ContactExecutionInsert = Database['public']['Tables']['projet_contacts_execution']['Insert'];

// §4 Personnes de l'organisme chargé d'exécuter le projet (consultant,
// entreprise...) sans compte SIM — sert de vivier pour le "responsable" d'un
// livrable et le "chargé de l'exécution" du projet, en plus des membres.
export async function listContactsExecution(projetId: string): Promise<ContactExecution[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/contacts-execution`);
  return toSnakeCase<ContactExecution[]>(data);
}

export async function ajouterContactExecution(insert: ContactExecutionInsert): Promise<ContactExecution> {
  const { projet_id, ...rest } = insert as ContactExecutionInsert & { projet_id: string };
  const data = await api.post<unknown>(`/projets/${projet_id}/contacts-execution`, toCamelCase(rest));
  return toSnakeCase<ContactExecution>(data);
}

export async function supprimerContactExecution(projetId: string, id: string): Promise<void> {
  await api.delete(`/projets/${projetId}/contacts-execution/${id}`);
}
