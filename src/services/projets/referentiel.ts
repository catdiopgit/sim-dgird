import { listListesValeurs, listValeursListes, type ValeurListe } from '../administration/parametrage';

const CODES_LISTES = [
  'projet_statut',
  'projet_priorite',
  'projet_role_equipe',
  'livrable_statut',
  'document_type_projet',
] as const;

export interface ProjetsReferentiel {
  statuts: ValeurListe[];
  priorites: ValeurListe[];
  rolesEquipe: ValeurListe[];
  statutsLivrable: ValeurListe[];
  typesDocument: ValeurListe[];
}

export async function fetchProjetsReferentiel(organisationId: string): Promise<ProjetsReferentiel> {
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
    statuts: parCode('projet_statut'),
    priorites: parCode('projet_priorite'),
    rolesEquipe: parCode('projet_role_equipe'),
    statutsLivrable: parCode('livrable_statut'),
    typesDocument: parCode('document_type_projet'),
  };
}
