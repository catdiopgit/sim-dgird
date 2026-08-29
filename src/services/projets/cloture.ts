import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Projet } from './projets';

export interface ControleCloture {
  bloquant: boolean;
  code: string;
  message: string;
}

// §9 Checklist en lecture seule, utilisée à la fois par l'onglet Clôture
// (affichage live) et implicitement par la demande de clôture côté serveur.
export async function verifierCloture(projetId: string): Promise<ControleCloture[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/cloture/checklist`);
  return toSnakeCase<ControleCloture[]>(data);
}

// §8 étape 2 — réservé au responsable du projet, échoue si un contrôle
// bloquant subsiste (message d'erreur détaillé renvoyé par le serveur).
export async function demanderCloture(projetId: string): Promise<Projet> {
  const data = await api.post<unknown>(`/projets/${projetId}/cloture/demander`);
  return toSnakeCase<Projet>(data);
}

// §8 étape 3 — réservé au responsable de l'entité porteuse ou à un supérieur
// hiérarchique.
export async function confirmerCloture(projetId: string, commentaire?: string | null): Promise<Projet> {
  const data = await api.post<unknown>(`/projets/${projetId}/cloture/confirmer`, { commentaire: commentaire ?? null });
  return toSnakeCase<Projet>(data);
}

export async function rejeterCloture(projetId: string, motif: string): Promise<Projet> {
  const data = await api.post<unknown>(`/projets/${projetId}/cloture/rejeter`, { motif });
  return toSnakeCase<Projet>(data);
}
