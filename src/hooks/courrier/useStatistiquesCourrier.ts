import { useQuery } from '@tanstack/react-query';
import { fetchStatistiquesCourrier } from '../../services/courrier/statistiques';

export function useStatistiquesCourrier(dateDebut?: string, dateFin?: string) {
  return useQuery({
    queryKey: ['statistiques-courrier', dateDebut, dateFin],
    queryFn: () => fetchStatistiquesCourrier(dateDebut, dateFin),
  });
}
