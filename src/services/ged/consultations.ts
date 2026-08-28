import { callRpc } from '../rpc';

// Traçabilité des accès en lecture (§12 du plan de refonte GED V2) — seul
// point d'écriture de ged_consultations, jamais un insert direct.
export async function tracerConsultation(documentId: string): Promise<void> {
  await callRpc<null>('fn_consulter_document', { p_document_id: documentId });
}

export async function tracerTelechargement(documentId: string): Promise<void> {
  await callRpc<null>('fn_telecharger_document', { p_document_id: documentId });
}
