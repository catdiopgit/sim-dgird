import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

// mot_de_passe volontairement absent : jamais renvoyé par le backend
// (server/administration/organisations, chiffré en base — voir MIGRATION.md
// Phase 1/encryption.util.ts). Seul definirParametresSmtp peut l'écrire.
export type ParametresSmtp = Database['public']['Tables']['parametres_smtp']['Row'];

export async function fetchParametresSmtp(organisationId: string): Promise<ParametresSmtp | null> {
  const data = await api.get<unknown>(`/administration/organisations/${organisationId}/smtp`);
  return data ? toSnakeCase<ParametresSmtp>(data) : null;
}

export interface DefinirParametresSmtpPayload {
  p_hote: string;
  p_port: number;
  p_securite: 'none' | 'tls' | 'ssl';
  p_utilisateur: string;
  // Vide/absent = conserver le mot de passe déjà enregistré.
  p_mot_de_passe?: string | null;
  p_adresse_expediteur: string;
  p_nom_expediteur?: string | null;
  p_actif: boolean;
}

export async function definirParametresSmtp(
  organisationId: string,
  payload: DefinirParametresSmtpPayload,
): Promise<void> {
  await api.post(`/administration/organisations/${organisationId}/smtp`, {
    hote: payload.p_hote,
    port: payload.p_port,
    securite: payload.p_securite,
    utilisateur: payload.p_utilisateur,
    motDePasse: payload.p_mot_de_passe || undefined,
    adresseExpediteur: payload.p_adresse_expediteur,
    nomExpediteur: payload.p_nom_expediteur ?? null,
    actif: payload.p_actif,
  });
}
