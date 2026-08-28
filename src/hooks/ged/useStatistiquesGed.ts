import { useQuery } from '@tanstack/react-query';
import { fetchStatistiquesGed } from '../../services/ged/statistiques';

export function useStatistiquesGed(dateDebut?: string, dateFin?: string) {
  return useQuery({
    queryKey: ['statistiques-ged', dateDebut, dateFin],
    queryFn: () => fetchStatistiquesGed(dateDebut, dateFin),
  });
}
