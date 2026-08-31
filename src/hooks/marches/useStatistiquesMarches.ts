import { useQuery } from '@tanstack/react-query';
import { fetchStatistiquesMarches, type FiltresStatistiquesMarches } from '../../services/marches/statistiques';

export function useStatistiquesMarches(filtres: FiltresStatistiquesMarches) {
  return useQuery({
    queryKey: ['statistiques-marches', filtres],
    queryFn: () => fetchStatistiquesMarches(filtres),
  });
}
