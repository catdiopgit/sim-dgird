import { supabase } from '../../config/supabase';
import { callRpc } from '../rpc';
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

// Compte les éléments éligibles sans rien créer — alimente le mini tableau
// de bord avant que l'archiviste ne clique sur "Préparer" (fn_archivage_
// compter_eligibles, migration 0082). Par défaut : année civile précédente.
export async function fetchArchivageCompteurs(dateDebut?: string, dateFin?: string): Promise<ArchivageCompteurs> {
  return callRpc<ArchivageCompteurs>('fn_archivage_compter_eligibles', {
    p_date_debut: dateDebut ?? null,
    p_date_fin: dateFin ?? null,
  });
}

// "Préparer l'archivage annuel" en un clic : détecte tous les éléments
// éligibles pour la période et remplace toute préparation en cours pour
// l'organisation (fn_archivage_preparer).
export async function preparerArchivage(dateDebut?: string, dateFin?: string): Promise<ArchivageOperation> {
  return callRpc<ArchivageOperation>('fn_archivage_preparer', {
    p_date_debut: dateDebut ?? null,
    p_date_fin: dateFin ?? null,
  });
}

// Reprend une préparation déjà lancée (rechargement de page, autre onglet)
// plutôt que de forcer un nouveau clic sur "Préparer".
export async function fetchOperationEnPreparation(organisationId: string): Promise<ArchivageOperation | null> {
  const { data, error } = await supabase
    .from('archivage_operations')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('statut', 'en_preparation')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listArchivageElements(operationId: string): Promise<ArchivageElement[]> {
  const { data, error } = await supabase
    .from('archivage_elements')
    .select('*')
    .eq('operation_id', operationId)
    .order('type_element', { ascending: true })
    .order('reference', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function definirSelectionElement(elementId: string, selectionne: boolean): Promise<ArchivageElement> {
  return callRpc<ArchivageElement>('fn_archivage_definir_selection', {
    p_element_id: elementId,
    p_selectionne: selectionne,
  });
}

// "Confirmer l'archivage" : classe définitivement les éléments sélectionnés
// (fn_archivage_confirmer) — irréversible en v1, cf. décision de scope.
export async function confirmerArchivage(operationId: string): Promise<ArchivageOperation> {
  return callRpc<ArchivageOperation>('fn_archivage_confirmer', { p_operation_id: operationId });
}
