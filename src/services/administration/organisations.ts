import { api } from '../../config/apiClient';
import { toCamelCase, toSnakeCase } from '../../utils/caseMapping';
import type { Database } from '../../types/database';

export type Organisation = Database['public']['Tables']['organisations']['Row'];
export type OrganisationUpdate = Database['public']['Tables']['organisations']['Update'];
export type OrganisationBranding = Database['public']['Views']['organisation_branding']['Row'];

export async function fetchOrganisationBranding(): Promise<OrganisationBranding | null> {
  const data = await api.get<unknown>('/administration/organisations/branding');
  return data ? toSnakeCase<OrganisationBranding>(data) : null;
}

export async function fetchOrganisation(organisationId: string): Promise<Organisation> {
  const data = await api.get<unknown>(`/administration/organisations/${organisationId}`);
  return toSnakeCase<Organisation>(data);
}

export async function updateOrganisation(id: string, patch: OrganisationUpdate): Promise<Organisation> {
  const data = await api.patch<unknown>(`/administration/organisations/${id}`, toCamelCase(patch));
  return toSnakeCase<Organisation>(data);
}

// Upload de logo : plus de bucket public Supabase Storage — sauvegardé sur
// disque local (STORAGE_ROOT/organisations, server/administration/organisations)
// et servi par un endpoint public dédié (les logos doivent rester visibles sans
// authentification, comme /administration/organisations/branding).
export async function uploadOrganisationImage(organisationId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { url } = await api.upload<{ url: string }>(
    `/administration/organisations/${organisationId}/logo`,
    formData,
  );
  return url;
}
