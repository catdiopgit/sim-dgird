import { useQuery } from '@tanstack/react-query';
import { listVersementsATraiter } from '../../services/ged/bannette';

export function useBannetteGed() {
  return useQuery({
    queryKey: ['ged-bannette'],
    queryFn: () => listVersementsATraiter(),
  });
}
