import { api } from '../../config/apiClient';

// Traçabilité des accès en lecture (§12 du plan de refonte GED V2). Le
// téléchargement (ex-fn_telecharger_document) n'a plus de trace séparée côté
// client : server/ged/ged-storage.service.ts (telecharger) l'enregistre déjà
// automatiquement à chaque GET /ged/versions/:id/telecharger.
export async function tracerConsultation(documentId: string): Promise<void> {
  await api.post(`/ged/documents/${documentId}/tracer-consultation`);
}
