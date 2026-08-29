import { listListesValeurs, listValeursListes, type ValeurListe } from '../administration/parametrage';

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
