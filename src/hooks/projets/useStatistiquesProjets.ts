import { useQuery } from '@tanstack/react-query';
import { fetchStatistiquesProjets, type FiltresStatistiquesProjets } from '../../services/projets/statistiques';

export function useStatistiquesProjets(filtres: FiltresStatistiquesProjets) {
  return useQuery({
    queryKey: [
      'statistiques-projets',
      filtres.dateDebut,
      filtres.dateFin,
      filtres.statutValeurId,
      filtres.responsableId,
      filtres.organismeExecutionType,
    ],
    queryFn: () => fetchStatistiquesProjets(filtres),
  });
}
