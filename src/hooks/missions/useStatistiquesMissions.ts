import { useQuery } from '@tanstack/react-query';
import { fetchStatistiquesMissions, type FiltresStatistiquesMissions } from '../../services/missions/statistiques';

export function useStatistiquesMissions(filtres: FiltresStatistiquesMissions) {
  return useQuery({
    queryKey: [
      'statistiques-missions',
      filtres.dateDebut,
      filtres.dateFin,
      filtres.entiteId,
      filtres.responsableId,
      filtres.etapeCode,
    ],
    queryFn: () => fetchStatistiquesMissions(filtres),
  });
}
