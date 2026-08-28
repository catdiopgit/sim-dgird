-- Phase 5 (GED): ponts RPC vers le schéma `app` + bucket Storage pour les
-- fichiers versionnés, sur le modèle exact de 0019 (Courrier). Le schéma
-- (0008), la RLS (0015) et le workflow ged-standard (seed, §8 du cahier des
-- charges) existent déjà depuis le commit initial — il ne manquait que ces
-- ponts et le bucket.

-- Dossiers -------------------------------------------------------------

create or replace function public.fn_creer_dossier_ged(
  p_libelle text,
  p_code text,
  p_entite_id uuid default null,
  p_parent_dossier_id uuid default null,
  p_categorie_id uuid default null,
  p_description text default null,
  p_icone text default null,
  p_couleur text default null
)
returns public.ged_dossiers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_dossier public.ged_dossiers;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;

  if not app.has_permission('ged', 'creer', p_entite_id) then
    raise exception 'Permission refusée (ged/creer)';
  end if;

  insert into public.ged_dossiers (
    organisation_id, entite_id, parent_dossier_id, code, libelle, description,
    categorie_id, icone, couleur, created_by
  ) values (
    v_organisation_id, p_entite_id, p_parent_dossier_id, p_code, p_libelle, p_description,
    p_categorie_id, p_icone, p_couleur, auth.uid()
  )
  returning * into v_dossier;

  return v_dossier;
end;
$$;

grant execute on function public.fn_creer_dossier_ged(text, text, uuid, uuid, uuid, text, text, text) to authenticated;

create or replace function public.fn_modifier_dossier_ged(
  p_dossier_id uuid,
  p_libelle text default null,
  p_description text default null,
  p_parent_dossier_id uuid default null,
  p_deplacer boolean default false,
  p_categorie_id uuid default null,
  p_icone text default null,
  p_couleur text default null
)
returns public.ged_dossiers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_dossier public.ged_dossiers;
begin
  select * into v_dossier from public.ged_dossiers where id = p_dossier_id;
  if not found then
    raise exception 'Dossier % introuvable', p_dossier_id;
  end if;

  if v_dossier.organisation_id <> app.current_organisation_id() then
    raise exception 'Dossier % hors de l''organisation courante', p_dossier_id;
  end if;

  if not app.has_permission('ged', 'modifier', v_dossier.entite_id) then
    raise exception 'Permission refusée (ged/modifier)';
  end if;

  update public.ged_dossiers
  set libelle = coalesce(p_libelle, libelle),
      description = coalesce(p_description, description),
      -- p_deplacer distingue "champ absent" (défaut) de "déplacer vers la
      -- racine" (p_parent_dossier_id = null explicite) : sans ce drapeau,
      -- coalesce(null, parent_dossier_id) ne permettrait jamais de vider le
      -- parent d'un dossier déjà imbriqué.
      parent_dossier_id = case when p_deplacer then p_parent_dossier_id else parent_dossier_id end,
      categorie_id = coalesce(p_categorie_id, categorie_id),
      icone = coalesce(p_icone, icone),
      couleur = coalesce(p_couleur, couleur)
  where id = p_dossier_id
  returning * into v_dossier;

  return v_dossier;
end;
$$;

grant execute on function public.fn_modifier_dossier_ged(uuid, text, text, uuid, boolean, uuid, text, text) to authenticated;

-- Documents --------------------------------------------------------------

create or replace function public.fn_creer_document(
  p_titre text,
  p_dossier_id uuid default null,
  p_description text default null,
  p_categorie_id uuid default null,
  p_entite_id uuid default null,
  p_confidentialite_valeur_id uuid default null,
  p_duree_conservation_mois integer default null
)
returns public.documents
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_workflow_instance_id uuid;
  v_etape_code text;
  v_etape_libelle text;
  v_document public.documents;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;

  if not app.has_permission('ged', 'creer', p_entite_id) then
    raise exception 'Permission refusée (ged/creer)';
  end if;

  v_workflow_instance_id := app.fn_demarrer_workflow('ged', v_organisation_id, auth.uid());

  -- Comme fn_creer_courrier (0019): le trigger app.sync_etape_cache ne peut
  -- pas encore avoir agi puisque la ligne documents n'existe pas au moment de
  -- l'appel ci-dessus -> on lit l'étape initiale directement sur l'instance.
  select we.code, we.libelle
  into v_etape_code, v_etape_libelle
  from public.workflow_instances wi
  join public.workflow_etapes we on we.id = wi.etape_courante_id
  where wi.id = v_workflow_instance_id;

  insert into public.documents (
    organisation_id, dossier_id, categorie_id, entite_id, titre, description,
    workflow_instance_id, etape_code, etape_libelle, confidentialite_valeur_id,
    duree_conservation_mois, created_by
  ) values (
    v_organisation_id, p_dossier_id, p_categorie_id, p_entite_id, p_titre, p_description,
    v_workflow_instance_id, v_etape_code, v_etape_libelle, p_confidentialite_valeur_id,
    p_duree_conservation_mois, auth.uid()
  )
  returning * into v_document;

  return v_document;
end;
$$;

grant execute on function public.fn_creer_document(text, uuid, text, uuid, uuid, uuid, integer) to authenticated;

create or replace function public.fn_verser_version_document(
  p_document_id uuid,
  p_storage_path text,
  p_nom_fichier text,
  p_taille_octets bigint default null,
  p_type_mime text default null,
  p_hash_sha256 text default null,
  p_commentaire text default null
)
returns public.document_versions
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_document public.documents;
  v_version_majeure integer;
  v_version public.document_versions;
begin
  select * into v_document from public.documents where id = p_document_id;
  if not found then
    raise exception 'Document % introuvable', p_document_id;
  end if;

  if v_document.organisation_id <> app.current_organisation_id() then
    raise exception 'Document % hors de l''organisation courante', p_document_id;
  end if;

  if not (v_document.created_by = auth.uid() or app.has_permission('ged', 'modifier', v_document.entite_id)) then
    raise exception 'Permission refusée sur le document %', p_document_id;
  end if;

  select coalesce(max(version_majeure), 0) + 1 into v_version_majeure
  from public.document_versions
  where document_id = p_document_id;

  insert into public.document_versions (
    document_id, version_majeure, version_mineure, storage_path, nom_fichier,
    taille_octets, type_mime, hash_sha256, commentaire, created_by
  ) values (
    p_document_id, v_version_majeure, 0, p_storage_path, p_nom_fichier,
    p_taille_octets, p_type_mime, p_hash_sha256, p_commentaire, auth.uid()
  )
  returning * into v_version;

  update public.documents set version_courante_id = v_version.id where id = p_document_id;

  return v_version;
end;
$$;

grant execute on function public.fn_verser_version_document(uuid, text, text, bigint, text, text, text) to authenticated;

-- Workflow -----------------------------------------------------------------
-- Miroir exact de fn_transitions_disponibles_courrier / fn_executer_transition_courrier
-- (0020/0042) : acteur + condition déjà résolus côté serveur, rien à
-- reproduire côté client.

create or replace function public.fn_transitions_disponibles_document(p_document_id uuid)
returns table (
  transition_id uuid,
  code text,
  libelle_action text,
  etape_cible_id uuid,
  etape_cible_libelle text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_document record;
  v_instance record;
begin
  if not app.can_view_document(p_document_id) then
    raise exception 'Document % introuvable ou accès refusé', p_document_id;
  end if;

  select * into v_document from public.documents where id = p_document_id;
  select * into v_instance from public.workflow_instances where id = v_document.workflow_instance_id;

  if v_instance.statut_instance <> 'en_cours' then
    return;
  end if;

  return query
  select wt.id, wt.code, wt.libelle_action, we.id, we.libelle
  from public.workflow_transitions wt
  join public.workflow_etapes we on we.id = wt.etape_cible_id
  where wt.workflow_definition_id = v_instance.workflow_definition_id
    and (wt.etape_source_id = v_instance.etape_courante_id or wt.etape_source_id is null)
    and app.acteur_de_transition_autorise(wt.id, auth.uid(), v_document.entite_id)
    and app.fn_condition_satisfaite(wt.condition, to_jsonb(v_document));
end;
$$;

grant execute on function public.fn_transitions_disponibles_document(uuid) to authenticated;

create or replace function public.fn_executer_transition_document(
  p_document_id uuid,
  p_transition_id uuid,
  p_commentaire text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_document record;
begin
  select * into v_document from public.documents where id = p_document_id;
  if not found then
    raise exception 'Document % introuvable', p_document_id;
  end if;

  if v_document.organisation_id <> app.current_organisation_id() then
    raise exception 'Document % hors de l''organisation courante', p_document_id;
  end if;

  if v_document.workflow_instance_id is null then
    raise exception 'Document % sans instance de workflow', p_document_id;
  end if;

  perform app.fn_executer_transition(
    v_document.workflow_instance_id,
    p_transition_id,
    auth.uid(),
    p_commentaire,
    v_document.entite_id,
    to_jsonb(v_document)
  );
end;
$$;

grant execute on function public.fn_executer_transition_document(uuid, uuid, text) to authenticated;

-- Bannette "À traiter" ------------------------------------------------------
-- Même logique que la branche 'a_traiter' de fn_bannettes_courrier (0049).

create or replace function public.fn_bannette_ged()
returns setof public.documents
language plpgsql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
begin
  return query
  select d.*
  from public.documents d
  join public.workflow_instances wi on wi.id = d.workflow_instance_id
  where d.supprime_le is null
    and d.organisation_id = app.current_organisation_id()
    and wi.statut_instance = 'en_cours'
    and app.can_view_document(d.id)
    and exists (
      select 1
      from public.workflow_transitions wt
      where wt.workflow_definition_id = wi.workflow_definition_id
        and (wt.etape_source_id = wi.etape_courante_id or wt.etape_source_id is null)
        and app.acteur_de_transition_autorise(wt.id, auth.uid(), d.entite_id)
        and app.fn_condition_satisfaite(wt.condition, to_jsonb(d))
    );
end;
$$;

grant execute on function public.fn_bannette_ged() to authenticated;

-- Droits (document_droits / dossier_droits) ---------------------------------
-- Écritures pontées plutôt que laissées à l'insert/delete direct: même
-- principe que fn_creer_courrier (revérifier la permission côté serveur, ne
-- pas se fier au seul RLS pour les écritures).

create or replace function public.fn_octroyer_droit_document(
  p_document_id uuid,
  p_action_code text,
  p_role_id uuid default null,
  p_utilisateur_id uuid default null,
  p_entite_id uuid default null
)
returns public.document_droits
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_document public.documents;
  v_action_id uuid;
  v_droit public.document_droits;
begin
  select * into v_document from public.documents where id = p_document_id;
  if not found then
    raise exception 'Document % introuvable', p_document_id;
  end if;

  if not app.has_permission('ged', 'modifier', v_document.entite_id) then
    raise exception 'Permission refusée (ged/modifier)';
  end if;

  select id into v_action_id from public.actions where code = p_action_code;
  if v_action_id is null then
    raise exception 'Action % introuvable', p_action_code;
  end if;

  insert into public.document_droits (document_id, role_id, utilisateur_id, entite_id, action_id)
  values (p_document_id, p_role_id, p_utilisateur_id, p_entite_id, v_action_id)
  returning * into v_droit;

  return v_droit;
end;
$$;

grant execute on function public.fn_octroyer_droit_document(uuid, text, uuid, uuid, uuid) to authenticated;

create or replace function public.fn_revoquer_droit_document(p_droit_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_document_id uuid;
  v_entite_id uuid;
begin
  select dd.document_id, d.entite_id into v_document_id, v_entite_id
  from public.document_droits dd
  join public.documents d on d.id = dd.document_id
  where dd.id = p_droit_id;

  if v_document_id is null then
    raise exception 'Droit % introuvable', p_droit_id;
  end if;

  if not app.has_permission('ged', 'modifier', v_entite_id) then
    raise exception 'Permission refusée (ged/modifier)';
  end if;

  delete from public.document_droits where id = p_droit_id;
end;
$$;

grant execute on function public.fn_revoquer_droit_document(uuid) to authenticated;

create or replace function public.fn_octroyer_droit_dossier(
  p_dossier_id uuid,
  p_action_code text,
  p_role_id uuid default null,
  p_utilisateur_id uuid default null,
  p_entite_id uuid default null
)
returns public.dossier_droits
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_dossier public.ged_dossiers;
  v_action_id uuid;
  v_droit public.dossier_droits;
begin
  select * into v_dossier from public.ged_dossiers where id = p_dossier_id;
  if not found then
    raise exception 'Dossier % introuvable', p_dossier_id;
  end if;

  if not app.has_permission('ged', 'modifier', v_dossier.entite_id) then
    raise exception 'Permission refusée (ged/modifier)';
  end if;

  select id into v_action_id from public.actions where code = p_action_code;
  if v_action_id is null then
    raise exception 'Action % introuvable', p_action_code;
  end if;

  insert into public.dossier_droits (dossier_id, role_id, utilisateur_id, entite_id, action_id)
  values (p_dossier_id, p_role_id, p_utilisateur_id, p_entite_id, v_action_id)
  returning * into v_droit;

  return v_droit;
end;
$$;

grant execute on function public.fn_octroyer_droit_dossier(uuid, text, uuid, uuid, uuid) to authenticated;

create or replace function public.fn_revoquer_droit_dossier(p_droit_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_dossier_id uuid;
  v_entite_id uuid;
begin
  select gd.dossier_id, d.entite_id into v_dossier_id, v_entite_id
  from public.dossier_droits gd
  join public.ged_dossiers d on d.id = gd.dossier_id
  where gd.id = p_droit_id;

  if v_dossier_id is null then
    raise exception 'Droit % introuvable', p_droit_id;
  end if;

  if not app.has_permission('ged', 'modifier', v_entite_id) then
    raise exception 'Permission refusée (ged/modifier)';
  end if;

  delete from public.dossier_droits where id = p_droit_id;
end;
$$;

grant execute on function public.fn_revoquer_droit_dossier(uuid) to authenticated;

-- Storage: fichiers de documents GED. Convention de chemin identique à
-- courrier-pieces-jointes (0019): {document_id}/{uuid}-{nom_fichier}.
insert into storage.buckets (id, name, public)
values ('ged-documents', 'ged-documents', false)
on conflict (id) do nothing;

create policy ged_documents_storage_select on storage.objects
  for select using (
    bucket_id = 'ged-documents'
    and app.can_view_document((storage.foldername(name))[1]::uuid)
  );

create policy ged_documents_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'ged-documents'
    and exists (
      select 1 from public.documents d
      where d.id = (storage.foldername(name))[1]::uuid
        and d.organisation_id = app.current_organisation_id()
        and (d.created_by = auth.uid() or app.has_permission('ged', 'modifier', d.entite_id))
    )
  );

create policy ged_documents_storage_delete on storage.objects
  for delete using (
    bucket_id = 'ged-documents'
    and exists (
      select 1 from public.documents d
      where d.id = (storage.foldername(name))[1]::uuid
        and d.organisation_id = app.current_organisation_id()
        and (d.created_by = auth.uid() or app.has_permission('ged', 'modifier', d.entite_id))
    )
  );
