import type { Database } from '../../types/database';

export type ArchivageOperation = Database['public']['Tables']['archivage_operations']['Row'];
export type ArchivageElement = Database['public']['Tables']['archivage_elements']['Row'];

export interface ArchivageCompteurs {
  dateDebut: string;
  dateFin: string;
  courriers: number;
  projets: number;
  missions: number;
  dejaArchives: number;
  derniereOperation: {
    dateDebut: string;
    dateFin: string;
    statut: ArchivageOperation['statut'];
    confirmeLe: string | null;
  } | null;
}

// Sous-système d'archivage annuel (archivage_operations/archivage_elements,
// migration 0082) : différé côté backend NestJS depuis la Phase 4
// (MIGRATION.md) — dépend en lecture de Projets/Missions, cross-module, jamais
// repris explicitement aux Phases 5/6. La page ArchivagePage reste donc non
// fonctionnelle tant que ces routes ne sont pas portées ; ces stubs lèvent une
// erreur claire plutôt que d'échouer silencieusement sur un import cassé.
const NON_IMPLEMENTE = "Le sous-système d'archivage annuel n'est pas encore porté côté serveur (voir MIGRATION.md).";

export async function fetchArchivageCompteurs(_dateDebut?: string, _dateFin?: string): Promise<ArchivageCompteurs> {
  throw new Error(NON_IMPLEMENTE);
}

export async function preparerArchivage(_dateDebut?: string, _dateFin?: string): Promise<ArchivageOperation> {
  throw new Error(NON_IMPLEMENTE);
}

export async function fetchOperationEnPreparation(_organisationId: string): Promise<ArchivageOperation | null> {
  throw new Error(NON_IMPLEMENTE);
}

export async function listArchivageElements(_operationId: string): Promise<ArchivageElement[]> {
  throw new Error(NON_IMPLEMENTE);
}

export async function definirSelectionElement(_elementId: string, _selectionne: boolean): Promise<ArchivageElement> {
  throw new Error(NON_IMPLEMENTE);
}

export async function confirmerArchivage(_operationId: string): Promise<ArchivageOperation> {
  throw new Error(NON_IMPLEMENTE);
}
