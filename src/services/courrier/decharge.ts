import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Courrier } from './courriers';

// Décharge = pièce justificative de dépôt (plan V4 §9) : upload multipart vers
// le serveur NestJS (server/courrier/courrier-storage.service.ts), qui
// verrouille le courrier dans la même transaction (ajouterDecharge, portage
// de app.fn_ajouter_decharge_courrier).
export async function ajouterDechargeCourrier(courrierId: string, file: File): Promise<Courrier> {
  const formData = new FormData();
  formData.append('file', file);
  const data = await api.upload<unknown>(`/courrier/courriers/${courrierId}/decharge`, formData);
  return toSnakeCase<Courrier>(data);
}

// Procédure exceptionnelle: motif obligatoire, journalisée explicitement côté
// serveur (jamais une levée de verrou silencieuse — plan V4 §10/§11).
export async function deverrouillerCourrier(courrierId: string, motif: string): Promise<Courrier> {
  const data = await api.post<unknown>(`/courrier/courriers/${courrierId}/deverrouiller`, { motif });
  return toSnakeCase<Courrier>(data);
}
