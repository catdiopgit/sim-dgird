import { supabase } from '../../config/supabase';
import type { ValeurListe } from '../administration/parametrage';

const CODES_LISTES = [
  'courrier_type',
  'courrier_priorite',
  'courrier_confidentialite',
  'courrier_mode_transmission',
  'courrier_type_expediteur',
  'courrier_type_destinataire',
  'courrier_sens',
  'courrier_statut_reception',
  'courrier_action_demandee',
] as const;

export interface CourrierReferentiel {
  types: ValeurListe[];
  priorites: ValeurListe[];
  confidentialites: ValeurListe[];
  modesTransmission: ValeurListe[];
  typesExpediteur: ValeurListe[];
  typesDestinataire: ValeurListe[];
  sens: ValeurListe[];
  statutsReception: ValeurListe[];
  actionsDemandees: ValeurListe[];
}

export async function fetchCourrierReferentiel(organisationId: string): Promise<CourrierReferentiel> {
  const { data: listes, error: listesError } = await supabase
    .from('listes_valeurs')
    .select('id, code')
    .eq('organisation_id', organisationId)
    .in('code', CODES_LISTES as unknown as string[]);
  if (listesError) throw listesError;

  const listeIdParCode = new Map((listes ?? []).map((l) => [l.code, l.id]));
  const listeIds = (listes ?? []).map((l) => l.id);

  let valeurs: ValeurListe[] = [];
  if (listeIds.length > 0) {
    const { data, error } = await supabase
      .from('valeurs_listes')
      .select('*')
      .in('liste_id', listeIds)
      .eq('actif', true)
      .order('ordre', { ascending: true });
    if (error) throw error;
    valeurs = data ?? [];
  }

  const parCode = (code: (typeof CODES_LISTES)[number]) => {
    const listeId = listeIdParCode.get(code);
    if (!listeId) return [];
    return valeurs.filter((v) => v.liste_id === listeId);
  };

  return {
    types: parCode('courrier_type'),
    priorites: parCode('courrier_priorite'),
    confidentialites: parCode('courrier_confidentialite'),
    modesTransmission: parCode('courrier_mode_transmission'),
    typesExpediteur: parCode('courrier_type_expediteur'),
    typesDestinataire: parCode('courrier_type_destinataire'),
    sens: parCode('courrier_sens'),
    statutsReception: parCode('courrier_statut_reception'),
    actionsDemandees: parCode('courrier_action_demandee'),
  };
}
