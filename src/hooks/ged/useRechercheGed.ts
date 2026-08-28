import { useQuery } from '@tanstack/react-query';
import { rechercherDocuments, type RechercheDocumentsPayload } from '../../services/ged/recherche';

const TAILLE_PAGE = 200;

// Pagination simple (offset croissant) plutôt qu'un scroll infini : le
// bouton "Charger plus" de ArchivesContent augmente `page`, et on sait qu'il
// reste potentiellement plus de résultats si la dernière page reçue est pleine.
export function useRechercheDocuments(
  payload: Omit<RechercheDocumentsPayload, 'p_limite' | 'p_decalage'>,
  actif: boolean,
  page = 0,
) {
  const payloadPagine: RechercheDocumentsPayload = {
    ...payload,
    p_limite: TAILLE_PAGE,
    p_decalage: page * TAILLE_PAGE,
  };
  const requete = useQuery({
    queryKey: ['ged-recherche', payloadPagine],
    queryFn: () => rechercherDocuments(payloadPagine),
    enabled: actif,
    placeholderData: (precedent) => precedent,
  });
  return { ...requete, pagePleine: (requete.data?.length ?? 0) === TAILLE_PAGE, tailleP: TAILLE_PAGE };
}
