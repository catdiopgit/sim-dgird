import { supabase } from '../../config/supabase';
import type { Database } from '../../types/database';

export type Organisation = Database['public']['Tables']['organisations']['Row'];
export type OrganisationUpdate = Database['public']['Tables']['organisations']['Update'];
export type OrganisationBranding = Database['public']['Views']['organisation_branding']['Row'];

export async function fetchOrganisationBranding(): Promise<OrganisationBranding | null> {
  const { data, error } = await supabase.from('organisation_branding').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchOrganisation(organisationId: string): Promise<Organisation> {
  const { data, error } = await supabase
    .from('organisations')
    .select('*')
    .eq('id', organisationId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrganisation(
  id: string,
  patch: OrganisationUpdate,
): Promise<Organisation> {
  const { data, error } = await supabase
    .from('organisations')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

const BUCKET_IMAGES = 'organisation-images';

// Logo / logo droit (armoiries) : upload direct, retourne l'URL publique à
// stocker dans organisations.logo_url ou le paramètre document.entete —
// bucket public dédié (0051), pas de courrierId donc pas de bucket
// courrier-pieces-jointes.
export async function uploadOrganisationImage(organisationId: string, file: File): Promise<string> {
  const chemin = `${organisationId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET_IMAGES).upload(chemin, file);
  if (uploadError) throw uploadError;
  return supabase.storage.from(BUCKET_IMAGES).getPublicUrl(chemin).data.publicUrl;
}
