import { api } from '../../config/apiClient';

// v8.7 — versements automatiques (Courriers, Projets, Marchés).
export type ModuleVerse = 'courrier' | 'projet' | 'marche';

export interface GroupeVersementAuto {
  cle: string;
  type: ModuleVerse;
  titre: string;
  direction: string;
  regroupement: string;
  dossierCible: string | null;
  dateDebut: string;
  dateFin: string;
  nbElements: number;
  nbDocuments: number;
}
export interface ElementEcarte {
  type: ModuleVerse;
  reference: string;
  libelle: string;
  motif: string;
}
export interface ApercuVersementsAuto {
  groupes: GroupeVersementAuto[];
  ecartes: ElementEcarte[];
  totaux: { versements: number; elements: number; documents: number; ecartes: number };
}
export interface LancementVersementsAuto {
  id: string;
  date_debut: string;
  date_fin: string;
  modules: ModuleVerse[];
  programme: boolean;
  lance_le: string;
  lance_par: string;
  nb_versements: number;
  nb_elements: number;
  nb_documents: number;
  nb_ecartes: number;
  ecartes: ElementEcarte[];
}
export interface ElementVerse {
  type_element: ModuleVerse;
  element_id: string;
  reference: string | null;
  libelle: string | null;
  date_element: string | null;
  nb_documents: number;
}

export const apercuVersementsAuto = (debut: string, fin: string, modules: ModuleVerse[]) =>
  api.post<ApercuVersementsAuto>('/ged/versements-auto/apercu', { debut, fin, modules });
export const lancerVersementsAuto = (debut: string, fin: string, modules: ModuleVerse[]) =>
  api.post<{ versements: Array<{ id: string; titre: string }>; nbElements: number; nbDocuments: number; ecartes: ElementEcarte[] }>(
    '/ged/versements-auto/lancer',
    { debut, fin, modules },
  );
export const listLancementsAuto = () => api.get<LancementVersementsAuto[]>('/ged/versements-auto/lancements');
export const parametreVersementsAuto = () => api.get<{ annuelActif: boolean }>('/ged/versements-auto/parametre');
export const definirParametreVersementsAuto = (annuelActif: boolean) =>
  api.put<{ annuelActif: boolean }>('/ged/versements-auto/parametre', { annuelActif });
export const elementsDuVersement = (versementId: string) => api.get<ElementVerse[]>(`/ged/versements/${versementId}/elements`);
export const statutElementVerse = (type: ModuleVerse, id: string) =>
  api.get<{ etat: 'en_cours' | 'archive' | null; versementId?: string; codeArchivage?: string | null }>('/ged/elements-verses', { type, id });

export const LIBELLES_MODULES: Record<ModuleVerse, string> = { courrier: 'Courriers', projet: 'Projets', marche: 'Marchés' };
