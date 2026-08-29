import { listListesValeurs, listValeursListes, type ValeurListe } from '../administration/parametrage';

// Liste partagée entre Courrier et GED (listes_valeurs.module_id null) —
// rien à dupliquer.
const CODE_CONFIDENTIALITE = 'courrier_confidentialite';

export async function fetchConfidentialitesGed(organisationId: string): Promise<ValeurListe[]> {
  const listes = await listListesValeurs(organisationId);
  const liste = listes.find((l) => l.code === CODE_CONFIDENTIALITE);
  if (!liste) return [];
  const valeurs = await listValeursListes(liste.id);
  return valeurs.filter((v) => v.actif).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
}
