import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Courrier = Database['public']['Tables']['courriers']['Row'];
export type CourrierUpdate = Database['public']['Tables']['courriers']['Update'];
export type SensCourrier = Database['public']['Enums']['sens_courrier'];

export interface CourrierFiltres {
  sens?: SensCourrier;
  recherche?: string;
}

// organisationId n'est pas transmis : le backend le déduit de l'utilisateur
// courant (JWT) — voir server/courrier/courriers.controller.ts.
export async function listCourriers(
  _organisationId: string,
  filtres: CourrierFiltres = {},
): Promise<Courrier[]> {
  const data = await api.get<unknown[]>('/courrier/courriers', {
    sens: filtres.sens,
    recherche: filtres.recherche,
  });
  return toSnakeCase<Courrier[]>(data);
}

export async function getCourrier(id: string): Promise<Courrier> {
  const data = await api.get<unknown>(`/courrier/courriers/${id}`);
  return toSnakeCase<Courrier>(data);
}

// Champs informatifs seulement: sens/numero/workflow_instance_id/etape_* sont
// gérés par le moteur de workflow (création/transition), jamais en écriture directe.
export type CourrierPatchInfos = Pick<
  CourrierUpdate,
  | 'objet'
  | 'type_valeur_id'
  | 'priorite_valeur_id'
  | 'confidentialite_valeur_id'
  | 'mode_transmission_valeur_id'
  | 'date_courrier'
  | 'date_reception'
  | 'date_envoi'
  | 'expediteur_nom'
  | 'expediteur_type_valeur_id'
  | 'destinataire_texte'
  | 'entite_destinataire_id'
  | 'agent_destinataire_id'
  | 'observations'
>;

export async function updateCourrier(id: string, patch: CourrierPatchInfos): Promise<Courrier> {
  const data = await api.patch<unknown>(`/courrier/courriers/${id}`, toCamelCase(patch));
  return toSnakeCase<Courrier>(data);
}

// Suppression douce (colonne supprime_le) — gérée côté serveur.
export async function supprimerCourrier(id: string): Promise<void> {
  await api.delete(`/courrier/courriers/${id}`);
}

export interface CreerCourrierPayload {
  p_sens: SensCourrier;
  p_objet: string;
  // Optionnel: pour un courrier arrivé, laisser vide pour laisser le routage
  // initial (paramètre d'organisation) déterminer l'entité automatiquement.
  p_entite_id?: string | null;
  p_type_valeur_id?: string | null;
  p_priorite_valeur_id?: string | null;
  p_confidentialite_valeur_id?: string | null;
  p_mode_transmission_valeur_id?: string | null;
  p_date_courrier?: string | null;
  p_date_reception?: string | null;
  p_date_envoi?: string | null;
  p_expediteur_nom?: string | null;
  p_expediteur_type_valeur_id?: string | null;
  p_destinataire_texte?: string | null;
  p_entite_destinataire_id?: string | null;
  p_agent_destinataire_id?: string | null;
  p_contact_destinataire_id?: string | null;
  p_statut_reception_valeur_id?: string | null;
  p_expediteur_contact_id?: string | null;
  p_reference_expediteur?: string | null;
  p_observations?: string | null;
}

export async function creerCourrier(payload: CreerCourrierPayload): Promise<Courrier> {
  const data = await api.post<unknown>('/courrier/courriers', {
    sens: payload.p_sens,
    objet: payload.p_objet,
    entiteId: payload.p_entite_id ?? null,
    typeValeurId: payload.p_type_valeur_id ?? null,
    prioriteValeurId: payload.p_priorite_valeur_id ?? null,
    confidentialiteValeurId: payload.p_confidentialite_valeur_id ?? null,
    modeTransmissionValeurId: payload.p_mode_transmission_valeur_id ?? null,
    dateCourrier: payload.p_date_courrier ?? null,
    dateReception: payload.p_date_reception ?? null,
    dateEnvoi: payload.p_date_envoi ?? null,
    expediteurNom: payload.p_expediteur_nom ?? null,
    expediteurTypeValeurId: payload.p_expediteur_type_valeur_id ?? null,
    destinataireTexte: payload.p_destinataire_texte ?? null,
    entiteDestinataireId: payload.p_entite_destinataire_id ?? null,
    agentDestinataireId: payload.p_agent_destinataire_id ?? null,
    contactDestinataireId: payload.p_contact_destinataire_id ?? null,
    statutReceptionValeurId: payload.p_statut_reception_valeur_id ?? null,
    expediteurContactId: payload.p_expediteur_contact_id ?? null,
    referenceExpediteur: payload.p_reference_expediteur ?? null,
    observations: payload.p_observations ?? null,
  });
  return toSnakeCase<Courrier>(data);
}

export type Bannette = 'a_traiter' | 'en_retard' | 'archives' | 'sortants' | 'en_copie' | 'clotures';

// Architecture bannettes (plan V3 §H) : une route serveur unique par
// bannette, réutilisant les briques du moteur de workflow (acteur autorisé,
// délais, étapes finales) plutôt que des filtres client.
export async function listBannetteCourriers(bannette: Bannette): Promise<Courrier[]> {
  const data = await api.get<unknown[]>(`/courrier/courriers/bannettes/${bannette}`);
  return toSnakeCase<Courrier[]>(data);
}
