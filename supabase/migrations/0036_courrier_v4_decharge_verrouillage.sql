-- Gestion des courriers V4 (étape 4/7, cf. plan) : décharge (pièce
-- justificative de dépôt d'un courrier départ) et verrouillage définitif du
-- courrier une fois la décharge validée. Le verrouillage est appliqué au
-- niveau RLS (base), pas seulement dans l'UI (exigence explicite §11).

alter table public.courrier_pieces_jointes
  add column est_decharge boolean not null default false;

alter table public.courriers
  add column verrouille_le timestamptz,
  add column verrouille_par uuid references public.utilisateurs(id) on delete set null;

insert into public.actions (code, libelle) values
  ('deverrouiller', 'Déverrouiller')
on conflict (code) do nothing;

insert into public.permissions (role_id, module_id, action_id, portee)
select r.id, m.id, a.id, 'organisation'::public.portee_permission
from public.roles r
join public.modules m on m.code = 'courrier'
join public.actions a on a.code = 'deverrouiller'
where r.code = 'administrateur'
on conflict (role_id, module_id, action_id) do nothing;

-- Verrouillage appliqué en RLS: une écriture directe (hors fonctions dédiées
-- ci-dessous) échoue dès que courriers.verrouille_le est renseigné, sauf pour
-- qui a la permission courrier/deverrouiller.
drop policy if exists courriers_update on public.courriers;
create policy courriers_update on public.courriers
  for update using (
    organisation_id = app.current_organisation_id()
    and (created_by = auth.uid() or app.has_permission('courrier', 'modifier', entite_id))
    and (verrouille_le is null or app.has_permission('courrier', 'deverrouiller', entite_id))
  )
  with check (organisation_id = app.current_organisation_id());

drop policy if exists courrier_destinataires_write on public.courrier_destinataires;
create policy courrier_destinataires_write on public.courrier_destinataires
  for all using (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_destinataires.courrier_id
        and (c.created_by = auth.uid() or app.has_permission('courrier', 'modifier', c.entite_id))
        and (c.verrouille_le is null or app.has_permission('courrier', 'deverrouiller', c.entite_id))
    )
  )
  with check (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_destinataires.courrier_id and c.organisation_id = app.current_organisation_id()
    )
  );

drop policy if exists courrier_pieces_jointes_write on public.courrier_pieces_jointes;
create policy courrier_pieces_jointes_write on public.courrier_pieces_jointes
  for all using (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_pieces_jointes.courrier_id
        and (c.created_by = auth.uid() or app.has_permission('courrier', 'modifier', c.entite_id))
        and (c.verrouille_le is null or app.has_permission('courrier', 'deverrouiller', c.entite_id))
    )
  )
  with check (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_pieces_jointes.courrier_id and c.organisation_id = app.current_organisation_id()
    )
  );

-- Ajoute la décharge (réutilise courrier_pieces_jointes/le bucket existant,
-- même patron que est_scan) et verrouille le courrier, en une transaction.
create or replace function public.fn_ajouter_decharge_courrier(
  p_courrier_id uuid,
  p_storage_path text,
  p_nom_fichier text,
  p_taille_octets bigint default null,
  p_type_mime text default null
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
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

  if v_courrier.verrouille_le is not null then
    raise exception 'Courrier % déjà verrouillé', p_courrier_id;
  end if;

  if not (
    v_courrier.created_by = auth.uid()
    or app.has_permission('courrier', 'modifier', v_courrier.entite_id)
  ) then
    raise exception 'Permission refusée sur le courrier %', p_courrier_id;
  end if;

  insert into public.courrier_pieces_jointes (
    courrier_id, storage_path, nom_fichier, taille_octets, type_mime, est_decharge, created_by
  ) values (
    p_courrier_id, p_storage_path, p_nom_fichier, p_taille_octets, p_type_mime, true, auth.uid()
  );

  update public.courriers
  set verrouille_le = now(), verrouille_par = auth.uid()
  where id = p_courrier_id
  returning * into v_courrier;

  return v_courrier;
end;
$$;

grant execute on function public.fn_ajouter_decharge_courrier(uuid, text, text, bigint, text) to authenticated;

-- Déverrouillage exceptionnel: réservé à courrier/deverrouiller, motif
-- obligatoire, journalisé explicitement (jamais silencieux — §10/§11 du
-- prompt V4).
create or replace function public.fn_deverrouiller_courrier(
  p_courrier_id uuid,
  p_motif text
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_courrier record;
  v_action_id uuid;
begin
  if p_motif is null or btrim(p_motif) = '' then
    raise exception 'Un motif est obligatoire pour déverrouiller un courrier';
  end if;

  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  if not app.has_permission('courrier', 'deverrouiller', v_courrier.entite_id) then
    raise exception 'Permission refusée (courrier/deverrouiller)';
  end if;

  select id into v_action_id from public.actions where code = 'deverrouiller';

  insert into public.journal_audit (
    utilisateur_id, organisation_id, action_id, objet_type, objet_id, ancienne_valeur, nouvelle_valeur
  ) values (
    auth.uid(), v_courrier.organisation_id, v_action_id, 'courriers', p_courrier_id,
    jsonb_build_object('verrouille_le', v_courrier.verrouille_le, 'verrouille_par', v_courrier.verrouille_par),
    jsonb_build_object('motif', p_motif)
  );

  update public.courriers
  set verrouille_le = null, verrouille_par = null
  where id = p_courrier_id
  returning * into v_courrier;

  return v_courrier;
end;
$$;

grant execute on function public.fn_deverrouiller_courrier(uuid, text) to authenticated;
