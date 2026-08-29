import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type PieceJointe = Database['public']['Tables']['courrier_pieces_jointes']['Row'];

export async function listPiecesJointes(courrierId: string): Promise<PieceJointe[]> {
  const data = await api.get<unknown[]>(`/courrier/courriers/${courrierId}/pieces-jointes`);
  return toSnakeCase<PieceJointe[]>(data);
}

export async function uploadPieceJointe(
  courrierId: string,
  file: File,
  estScan: boolean,
): Promise<PieceJointe> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('estScan', String(estScan));
  const data = await api.upload<unknown>(`/courrier/courriers/${courrierId}/pieces-jointes`, formData);
  return toSnakeCase<PieceJointe>(data);
}

// storagePath n'est plus nécessaire (le serveur retrouve le fichier par id de
// pièce jointe) — conservé en paramètre pour ne pas casser les appelants existants.
export async function supprimerPieceJointe(id: string, _storagePath: string): Promise<void> {
  await api.delete(`/courrier/pieces-jointes/${id}`);
}
