import { useQuery } from '@tanstack/react-query';
import { fetchEcheancesProchaines } from '../../services/dashboard/echeances';

export function useEcheancesProchaines(horizonJours = 30) {
  return useQuery({
    queryKey: ['echeances-prochaines', horizonJours],
    queryFn: () => fetchEcheancesProchaines(horizonJours),
  });
}
