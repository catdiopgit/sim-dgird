import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Contact = Database['public']['Tables']['contacts']['Row'];
export type ContactType = 'personne' | 'entreprise' | 'administration';

export interface ContactInsert {
  organisation_id: string;
  nom: string;
  type?: ContactType;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
}

// organisationId n'est pas transmis : le backend le déduit de l'utilisateur
// courant (JWT) — voir server/courrier/contacts.controller.ts.
export async function listContacts(_organisationId: string, recherche?: string): Promise<Contact[]> {
  const data = await api.get<unknown[]>('/courrier/contacts', { recherche });
  return toSnakeCase<Contact[]>(data);
}

export async function creerContact(insert: ContactInsert): Promise<Contact> {
  const data = await api.post<unknown>('/courrier/contacts', {
    nom: insert.nom,
    type: insert.type,
    email: insert.email,
    telephone: insert.telephone,
    adresse: insert.adresse,
  });
  return toSnakeCase<Contact>(data);
}
