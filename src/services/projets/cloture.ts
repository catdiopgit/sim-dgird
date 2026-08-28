import { callRpc } from '../rpc';
import type { Projet } from './projets';

export interface ControleCloture {
  bloquant: boolean;
  code: string;
  message: string;
}

// §9 Checklist en lecture seule, utilisée à la fois par l'onglet Clôture
// (affichage live) et implicitement par fn_demander_cloture_projet côté serveur.
export async function verifierCloture(projetId: string): Promise<ControleCloture[]> {
  return callRpc<ControleCloture[]>('fn_verifier_cloture_projet', { p_projet_id: projetId });
}

// §8 étape 2 — réservé au responsable du projet, échoue si un contrôle
// bloquant subsiste (message d'erreur détaillé renvoyé par le serveur).
export async function demanderCloture(projetId: string): Promise<Projet> {
  return callRpc<Projet>('fn_demander_cloture_projet', { p_projet_id: projetId });
}

// §8 étape 3 — réservé au responsable de l'entité porteuse ou à un supérieur
// hiérarchique.
export async function confirmerCloture(projetId: string, commentaire?: string | null): Promise<Projet> {
  return callRpc<Projet>('fn_confirmer_cloture_projet', {
    p_projet_id: projetId,
    p_commentaire: commentaire ?? null,
  });
}

export async function rejeterCloture(projetId: string, motif: string): Promise<Projet> {
  return callRpc<Projet>('fn_rejeter_cloture_projet', { p_projet_id: projetId, p_motif: motif });
}
