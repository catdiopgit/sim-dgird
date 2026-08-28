-- RLS: GED et Courrier. Logique de visibilité centralisée dans deux fonctions
-- app.can_view_document / app.can_view_courrier, réutilisées par les policies
-- des tables filles plutôt que dupliquées.

create or replace function app.can_view_document(p_document_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc record;
  v_result boolean;
begin
  select * into v_doc from public.documents where id = p_document_id;
  if not found then
    return false;
  end if;

  if v_doc.organisation_id <> app.current_organisation_id() then
    return false;
  end if;

  if v_doc.created_by = auth.uid() or app.has_permission('ged', 'consulter', v_doc.entite_id) then
    return true;
  end if;

  select true into v_result
  from public.document_droits dd
  left join public.utilisateur_roles ur on ur.role_id = dd.role_id and ur.utilisateur_id = auth.uid()
  where dd.document_id = p_document_id
    and dd.action_id = (select id from public.actions where code = 'consulter')
    and (dd.utilisateur_id = auth.uid() or dd.entite_id = app.current_entite_id() or ur.utilisateur_id is not null)
  limit 1;

  if coalesce(v_result, false) then
    return true;
  end if;

  if v_doc.dossier_id is not null then
    -- Droits hérités du dossier parent si aucun droit explicite sur le document.
    select true into v_result
    from public.dossier_droits dr
    left join public.utilisateur_roles ur on ur.role_id = dr.role_id and ur.utilisateur_id = auth.uid()
    where dr.dossier_id = v_doc.dossier_id
      and dr.action_id = (select id from public.actions where code = 'consulter')
      and (dr.utilisateur_id = auth.uid() or dr.entite_id = app.current_entite_id() or ur.utilisateur_id is not null)
    limit 1;
  end if;

  return coalesce(v_result, false);
end;
$$;

create or replace function app.can_view_courrier(p_courrier_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_courrier record;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    return false;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    return false;
  end if;

  if v_courrier.created_by = auth.uid()
    or v_courrier.entite_id = app.current_entite_id()
    or v_courrier.entite_destinataire_id = app.current_entite_id()
    or v_courrier.agent_destinataire_id = auth.uid()
    or app.has_permission('courrier', 'consulter', v_courrier.entite_id)
  then
    return true;
  end if;

  return exists (
    select 1 from public.courrier_destinataires cd
    where cd.courrier_id = p_courrier_id
      and (cd.utilisateur_id = auth.uid() or cd.entite_id = app.current_entite_id())
  );
end;
$$;

alter table public.ged_categories enable row level security;

create policy ged_categories_select on public.ged_categories
  for select using (organisation_id = app.current_organisation_id());

create policy ged_categories_write on public.ged_categories
  for all using (app.has_permission('ged', 'modifier'))
  with check (organisation_id = app.current_organisation_id());

alter table public.ged_dossiers enable row level security;

create policy ged_dossiers_select on public.ged_dossiers
  for select using (organisation_id = app.current_organisation_id());

create policy ged_dossiers_write on public.ged_dossiers
  for all using (organisation_id = app.current_organisation_id() and app.has_permission('ged', 'modifier', entite_id))
  with check (organisation_id = app.current_organisation_id());

alter table public.documents enable row level security;

create policy documents_select on public.documents
  for select using (app.can_view_document(id));

create policy documents_insert on public.documents
  for insert with check (
    organisation_id = app.current_organisation_id()
    and app.has_permission('ged', 'creer', entite_id)
  );

create policy documents_update on public.documents
  for update using (
    organisation_id = app.current_organisation_id()
    and (created_by = auth.uid() or app.has_permission('ged', 'modifier', entite_id))
  )
  with check (organisation_id = app.current_organisation_id());

create policy documents_delete on public.documents
  for delete using (app.has_permission('ged', 'supprimer', entite_id));

alter table public.document_versions enable row level security;

create policy document_versions_select on public.document_versions
  for select using (app.can_view_document(document_id));

create policy document_versions_insert on public.document_versions
  for insert with check (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and d.organisation_id = app.current_organisation_id()
        and (d.created_by = auth.uid() or app.has_permission('ged', 'modifier', d.entite_id))
    )
  );

alter table public.document_droits enable row level security;

create policy document_droits_select on public.document_droits
  for select using (app.can_view_document(document_id));

create policy document_droits_write on public.document_droits
  for all using (
    exists (
      select 1 from public.documents d
      where d.id = document_droits.document_id and app.has_permission('ged', 'modifier', d.entite_id)
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_droits.document_id and app.has_permission('ged', 'modifier', d.entite_id)
    )
  );

alter table public.dossier_droits enable row level security;

create policy dossier_droits_select on public.dossier_droits
  for select using (
    exists (
      select 1 from public.ged_dossiers gd
      where gd.id = dossier_droits.dossier_id and gd.organisation_id = app.current_organisation_id()
    )
  );

create policy dossier_droits_write on public.dossier_droits
  for all using (
    exists (
      select 1 from public.ged_dossiers gd
      where gd.id = dossier_droits.dossier_id and app.has_permission('ged', 'modifier', gd.entite_id)
    )
  )
  with check (
    exists (
      select 1 from public.ged_dossiers gd
      where gd.id = dossier_droits.dossier_id and app.has_permission('ged', 'modifier', gd.entite_id)
    )
  );

alter table public.courriers enable row level security;

create policy courriers_select on public.courriers
  for select using (app.can_view_courrier(id));

create policy courriers_insert on public.courriers
  for insert with check (
    organisation_id = app.current_organisation_id()
    and app.has_permission('courrier', 'creer', entite_id)
  );

create policy courriers_update on public.courriers
  for update using (
    organisation_id = app.current_organisation_id()
    and (created_by = auth.uid() or app.has_permission('courrier', 'modifier', entite_id))
  )
  with check (organisation_id = app.current_organisation_id());

create policy courriers_delete on public.courriers
  for delete using (app.has_permission('courrier', 'supprimer', entite_id));

alter table public.courrier_pieces_jointes enable row level security;

create policy courrier_pieces_jointes_select on public.courrier_pieces_jointes
  for select using (app.can_view_courrier(courrier_id));

create policy courrier_pieces_jointes_write on public.courrier_pieces_jointes
  for all using (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_pieces_jointes.courrier_id
        and (c.created_by = auth.uid() or app.has_permission('courrier', 'modifier', c.entite_id))
    )
  )
  with check (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_pieces_jointes.courrier_id and c.organisation_id = app.current_organisation_id()
    )
  );

alter table public.courrier_destinataires enable row level security;

create policy courrier_destinataires_select on public.courrier_destinataires
  for select using (app.can_view_courrier(courrier_id));

create policy courrier_destinataires_write on public.courrier_destinataires
  for all using (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_destinataires.courrier_id
        and (c.created_by = auth.uid() or app.has_permission('courrier', 'modifier', c.entite_id))
    )
  )
  with check (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_destinataires.courrier_id and c.organisation_id = app.current_organisation_id()
    )
  );
