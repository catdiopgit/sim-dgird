import { useQuery } from '@tanstack/react-query';
import { fetchOrganisationBranding } from '../../services/administration/organisations';

export function useOrganisationBranding() {
  return useQuery({
    queryKey: ['organisation-branding'],
    queryFn: fetchOrganisationBranding,
    staleTime: 5 * 60_000,
  });
}
