import { useQuery } from '@tanstack/react-query';
import { fetchConfidentialitesGed } from '../../services/ged/referentiel';

export function useConfidentialitesGed(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['ged-confidentialites', organisationId],
    queryFn: () => fetchConfidentialitesGed(organisationId!),
    enabled: Boolean(organisationId),
    staleTime: 5 * 60_000,
  });
}
