import { api } from '../../config/apiClient';
import { toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type ProjetVisibiliteEntite = Database['public']['Tables']['projet_visibilite_entites']['Row'];
export type ProjetVisibiliteUtilisateur = Database['public']['Tables']['projet_visibilite_utilisateurs']['Row'];

export async function listVisibiliteEntites(projetId: string): Promise<ProjetVisibiliteEntite[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/visibilite/entites`);
  return toSnakeCase<ProjetVisibiliteEntite[]>(data);
}

export async function listVisibiliteUtilisateurs(projetId: string): Promise<ProjetVisibiliteUtilisateur[]> {
  const data = await api.get<unknown[]>(`/projets/${projetId}/visibilite/utilisateurs`);
  return toSnakeCase<ProjetVisibiliteUtilisateur[]>(data);
}

// Remplace l'ensemble de la sélection (entités ou agents autorisés) en une
// fois : plus simple côté UI (un Select multiple) qu'un diff ajout/retrait.
export async function definirVisibiliteEntites(projetId: string, entiteIds: string[]): Promise<void> {
  await api.put(`/projets/${projetId}/visibilite/entites`, { ids: entiteIds });
}

export async function definirVisibiliteUtilisateurs(projetId: string, utilisateurIds: string[]): Promise<void> {
  await api.put(`/projets/${projetId}/visibilite/utilisateurs`, { ids: utilisateurIds });
}
