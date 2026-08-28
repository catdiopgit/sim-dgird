import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  fetchOrganisation,
  updateOrganisation,
  uploadOrganisationImage,
  type OrganisationUpdate,
} from '../../services/administration/organisations';

export function useOrganisation(organisationId: string | undefined) {
  return useQuery({
    queryKey: ['organisation', organisationId],
    queryFn: () => fetchOrganisation(organisationId!),
    enabled: Boolean(organisationId),
  });
}

export function useUpdateOrganisation(organisationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: OrganisationUpdate) => updateOrganisation(organisationId!, patch),
    onSuccess: () => {
      message.success('Organisation mise à jour.');
      void queryClient.invalidateQueries({ queryKey: ['organisation', organisationId] });
      void queryClient.invalidateQueries({ queryKey: ['organisation-branding'] });
    },
    onError: (error: Error) => message.error(error.message),
  });
}

export function useUploadOrganisationImage(organisationId: string | undefined) {
  return useMutation({
    mutationFn: (file: File) => uploadOrganisationImage(organisationId!, file),
    onError: (error: Error) => message.error(error.message),
  });
}
