import { supabase } from '../../config/supabase';
import type { ValeurListe } from '../administration/parametrage';

const CODES_LISTES = ['mission_type_participant', 'statut_generique'] as const;

export interface MissionsReferentiel {
  typesParticipant: ValeurListe[];
  statutsAction: ValeurListe[];
}

export async function fetchMissionsReferentiel(organisationId: string): Promise<MissionsReferentiel> {
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
    typesParticipant: parCode('mission_type_participant'),
    statutsAction: parCode('statut_generique'),
  };
}
