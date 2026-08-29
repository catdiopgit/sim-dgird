import { listListesValeurs, listValeursListes, type ValeurListe } from '../administration/parametrage';

const CODES_LISTES = ['mission_type_participant', 'statut_generique'] as const;

export interface MissionsReferentiel {
  typesParticipant: ValeurListe[];
  statutsAction: ValeurListe[];
}

export async function fetchMissionsReferentiel(organisationId: string): Promise<MissionsReferentiel> {
  const listes = await listListesValeurs(organisationId);
  const listesUtiles = listes.filter((l) => (CODES_LISTES as readonly string[]).includes(l.code));

  const valeursParListe = await Promise.all(listesUtiles.map((l) => listValeursListes(l.id)));
  const listeIdParCode = new Map(listesUtiles.map((l) => [l.code, l.id]));
  const valeurs = valeursParListe
    .flat()
    .filter((v) => v.actif)
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

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
