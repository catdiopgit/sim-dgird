import type { Database } from '../../types/database';

// Catégorie 9 (reporting/statistiques) : jamais portée côté NestJS — ces
// fonctions PL/pgSQL lisent app.current_organisation_id()/app.can_view_projet(),
// des fonctions de session dépendant du contexte RLS Supabase (auth.uid() via
// GUC de requête), qui n'existe plus une fois RLS désactivée (décision b,
// MIGRATION.md). Les rendre appelables demanderait de réimplémenter toute
// l'agrégation en TypeScript comme les autres catégories (3 à 8), pas
// seulement de changer le client HTTP — hors périmètre de la Phase 8
// (remplacement du client), à traiter dans une phase dédiée. Voir aussi
// services/ged/archivage.ts pour le même traitement (stub explicite).
const NON_IMPLEMENTE = 'Les statistiques Projets ne sont pas encore portées côté serveur (voir MIGRATION.md).';

export interface StatistiquesProjetsTotaux {
  total: number;
  enCours: number;
  aVenir: number;
  enRetard: number;
  clotures: number;
}

export interface StatistiquesProjetsRepartition {
  id: string;
  libelle: string;
  couleur: string | null;
  total: number;
}

export interface StatistiquesProjetsRepartitionOrganisme {
  cle: Database['public']['Enums']['organisme_execution_type'];
  total: number;
}

export interface StatistiquesProjetsFinancier {
  montantProjets: number;
  montantAvenants: number;
  montantContractuel: number;
  montantDecaisse: number;
  pourcentageDecaisse: number;
  resteADecaisser: number;
}

export interface StatistiquesProjetsLivrables {
  total: number;
  realises: number;
  enCoursOuNonRealises: number;
  tauxRealisation: number;
}

export interface StatistiquesProjetsEvolutionPoint {
  date: string;
  total: number;
}

export interface StatistiquesProjets {
  totaux: StatistiquesProjetsTotaux;
  avancementMoyen: number | null;
  parEtat: StatistiquesProjetsRepartition[];
  parOrganisme: StatistiquesProjetsRepartitionOrganisme[];
  parResponsable: { id: string; libelle: string; total: number }[];
  financier: StatistiquesProjetsFinancier;
  livrables: StatistiquesProjetsLivrables;
  evolution: StatistiquesProjetsEvolutionPoint[];
}

export interface FiltresStatistiquesProjets {
  dateDebut?: string;
  dateFin?: string;
  statutValeurId?: string;
  responsableId?: string;
  organismeExecutionType?: Database['public']['Enums']['organisme_execution_type'];
}

export async function fetchStatistiquesProjets(_filtres: FiltresStatistiquesProjets): Promise<StatistiquesProjets> {
  throw new Error(NON_IMPLEMENTE);
}
