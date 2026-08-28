-- Phase 4 (Courriers): ponts RPC vers le schéma `app` (non exposé par PostgREST,
-- voir config.toml api.schemas = ["public","graphql_public"]) + bucket Storage
-- pour les pièces jointes/scans.

create or replace function public.fn_creer_courrier(
  p_entite_id uuid,
  p_sens public.sens_courrier,
  p_objet text,
  p_type_valeur_id uuid default null,
  p_priorite_valeur_id uuid default null,
  p_confidentialite_valeur_id uuid default null,
  p_mode_transmission_valeur_id uuid default null,
  p_date_courrier date default current_date,
  p_date_reception timestamptz default null,
  p_date_envoi timestamptz default null,
  p_expediteur_nom text default null,
  p_expediteur_type_valeur_id uuid default null,
  p_destinataire_texte text default null,
  p_entite_destinataire_id uuid default null,
  p_agent_destinataire_id uuid default null,
  p_observations text default null
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_sens_valeur_id uuid;
  v_numero text;
  v_workflow_instance_id uuid;
  v_etape_code text;
  v_etape_libelle text;
  v_courrier public.courriers;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;

  -- SECURITY DEFINER contourne RLS: on revérifie nous-mêmes la permission plutôt
  -- que de faire confiance à un contrôle côté client.
  if not app.has_permission('courrier', 'creer', p_entite_id) then
    raise exception 'Permission refusée (courrier/creer)';
  end if;

  select vl.id into v_sens_valeur_id
  from public.valeurs_listes vl
  join public.listes_valeurs lv on lv.id = vl.liste_id
  where lv.organisation_id = v_organisation_id
    and lv.code = 'courrier_sens'
    and vl.code = p_sens::text;

  if v_sens_valeur_id is null then
    raise exception 'Valeur de liste courrier_sens introuvable pour %', p_sens;
  end if;

  v_numero := app.fn_generer_numero(v_organisation_id, 'courrier', null, v_sens_valeur_id);
  v_workflow_instance_id := app.fn_demarrer_workflow('courrier', v_organisation_id, auth.uid());

  -- L'étape initiale n'est pas codée en dur: lue depuis l'instance qui vient
  -- d'être démarrée (le trigger app.sync_etape_cache ne peut pas encore avoir
  -- agi puisque la ligne courriers n'existe pas au moment de l'appel ci-dessus).
  select we.code, we.libelle
  into v_etape_code, v_etape_libelle
  from public.workflow_instances wi
  join public.workflow_etapes we on we.id = wi.etape_courante_id
  where wi.id = v_workflow_instance_id;

  insert into public.courriers (
    organisation_id, entite_id, sens, numero, type_valeur_id, priorite_valeur_id,
    confidentialite_valeur_id, mode_transmission_valeur_id, objet, date_courrier,
    date_reception, date_envoi, expediteur_nom, expediteur_type_valeur_id,
    destinataire_texte, entite_destinataire_id, agent_destinataire_id,
    redacteur_id, workflow_instance_id, etape_code, etape_libelle, observations, created_by
  ) values (
    v_organisation_id, p_entite_id, p_sens, v_numero, p_type_valeur_id,
    p_priorite_valeur_id, p_confidentialite_valeur_id, p_mode_transmission_valeur_id, p_objet,
    coalesce(p_date_courrier, current_date), p_date_reception, p_date_envoi, p_expediteur_nom,
    p_expediteur_type_valeur_id, p_destinataire_texte, p_entite_destinataire_id,
    p_agent_destinataire_id, auth.uid(), v_workflow_instance_id, v_etape_code, v_etape_libelle,
    p_observations, auth.uid()
  )
  returning * into v_courrier;

  return v_courrier;
end;
$$;

grant execute on function public.fn_creer_courrier(
  uuid, public.sens_courrier, text, uuid, uuid, uuid, uuid, date, timestamptz, timestamptz,
  text, uuid, text, uuid, uuid, text
) to authenticated;

create or replace function public.fn_executer_transition_courrier(
  p_courrier_id uuid,
  p_transition_id uuid,
  p_commentaire text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_courrier record;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  -- Même règle que la policy RLS courriers_update (0015): créateur ou permission
  -- 'modifier'. Le contrôle plus fin par rôle (valider/signer/archiver) reste
  -- appliqué séparément par app.fn_executer_transition via workflow_transition_roles.
  if not (
    v_courrier.created_by = auth.uid()
    or app.has_permission('courrier', 'modifier', v_courrier.entite_id)
  ) then
    raise exception 'Permission refusée sur le courrier %', p_courrier_id;
  end if;

  if v_courrier.workflow_instance_id is null then
    raise exception 'Courrier % sans instance de workflow', p_courrier_id;
  end if;

  perform app.fn_executer_transition(v_courrier.workflow_instance_id, p_transition_id, auth.uid(), p_commentaire);
end;
$$;

grant execute on function public.fn_executer_transition_courrier(uuid, uuid, text) to authenticated;

-- Storage: pièces jointes / scans de courrier. Premier bucket du projet.
insert into storage.buckets (id, name, public)
values ('courrier-pieces-jointes', 'courrier-pieces-jointes', false)
on conflict (id) do nothing;

-- Convention de chemin: {courrier_id}/{uuid}-{nom_fichier}. storage.foldername(name)[1]
-- donne le premier segment, comparé à can_view_courrier / can_view_courrier pour aligner
-- la visibilité/écriture des fichiers sur celle du courrier porteur.
create policy courrier_pieces_jointes_storage_select on storage.objects
  for select using (
    bucket_id = 'courrier-pieces-jointes'
    and app.can_view_courrier((storage.foldername(name))[1]::uuid)
  );

create policy courrier_pieces_jointes_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'courrier-pieces-jointes'
    and exists (
      select 1 from public.courriers c
      where c.id = (storage.foldername(name))[1]::uuid
        and c.organisation_id = app.current_organisation_id()
        and (c.created_by = auth.uid() or app.has_permission('courrier', 'modifier', c.entite_id))
    )
  );

create policy courrier_pieces_jointes_storage_delete on storage.objects
  for delete using (
    bucket_id = 'courrier-pieces-jointes'
    and exists (
      select 1 from public.courriers c
      where c.id = (storage.foldername(name))[1]::uuid
        and c.organisation_id = app.current_organisation_id()
        and (c.created_by = auth.uid() or app.has_permission('courrier', 'modifier', c.entite_id))
    )
  );
