import { callRpc } from '../rpc';
import type { Document } from './documents';

export interface RechercheDocumentsPayload {
  p_texte?: string | null;
  p_dossier_id?: string | null;
  p_confidentialite_valeur_id?: string | null;
  p_seulement_non_classes?: boolean;
  p_limite?: number;
  p_decalage?: number;
}

// Recherche restreinte aux documents archivés (fn_rechercher_documents) —
// l'espace "Archives" ne porte pas sur les versements en cours. Le filtre
// dossier porte sur le plan de classement (ged_dossiers). Paginée
// (p_limite/p_decalage) pour rester correcte avec un volume important de
// documents ; p_seulement_non_classes cible le dossier virtuel "Non classés".
export async function rechercherDocuments(payload: RechercheDocumentsPayload): Promise<Document[]> {
  return callRpc<Document[]>('fn_rechercher_documents', { ...payload });
}
