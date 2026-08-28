-- Notifications par email sur les actions courrier (partie A) : configuration
-- SMTP par organisation. Table dédiée plutôt que parametres_organisation, dont
-- la lecture est ouverte à tout membre de l'organisation (parametres_organisation_select
-- ne vérifie que organisation_id, pas la permission admin) — impropre à un
-- mot de passe. Écriture exclusivement via fn_definir_parametres_smtp
-- (security definer, même patron que les autres fonctions d'administration
-- du projet) ; aucune policy insert/update pour authenticated.

create table public.parametres_smtp (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null unique references public.organisations(id) on delete cascade,
  hote text not null,
  port integer not null default 587,
  securite text not null default 'tls' check (securite in ('none', 'tls', 'ssl')),
  utilisateur text not null,
  mot_de_passe text,
  adresse_expediteur text not null,
  nom_expediteur text,
  actif boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.utilisateurs(id) on delete set null
);

create trigger trg_parametres_smtp_updated_at
  before update on public.parametres_smtp
  for each row execute function app.set_updated_at();

alter table public.parametres_smtp enable row level security;

create policy parametres_smtp_select on public.parametres_smtp
  for select using (
    organisation_id = app.current_organisation_id()
    and app.has_permission('administration', 'modifier')
  );

-- Le mot de passe n'est jamais renvoyé au client : seule l'Edge Function
-- d'envoi (clé service_role, qui n'est pas soumise à ces GRANTs) peut le lire.
revoke select (mot_de_passe) on public.parametres_smtp from authenticated, anon;

create or replace function public.fn_definir_parametres_smtp(
  p_hote text,
  p_port integer,
  p_securite text,
  p_utilisateur text,
  p_mot_de_passe text,
  p_adresse_expediteur text,
  p_nom_expediteur text default null,
  p_actif boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;

  if not app.has_permission('administration', 'modifier') then
    raise exception 'Permission refusée (administration/modifier)';
  end if;

  insert into public.parametres_smtp (
    organisation_id, hote, port, securite, utilisateur, mot_de_passe,
    adresse_expediteur, nom_expediteur, actif, updated_by
  ) values (
    v_organisation_id, p_hote, p_port, p_securite, p_utilisateur, p_mot_de_passe,
    p_adresse_expediteur, p_nom_expediteur, p_actif, auth.uid()
  )
  on conflict (organisation_id) do update
  set hote = excluded.hote,
      port = excluded.port,
      securite = excluded.securite,
      utilisateur = excluded.utilisateur,
      -- Laisser le mot de passe vide dans le formulaire conserve l'existant
      -- plutôt que de l'écraser par null.
      mot_de_passe = coalesce(nullif(excluded.mot_de_passe, ''), public.parametres_smtp.mot_de_passe),
      adresse_expediteur = excluded.adresse_expediteur,
      nom_expediteur = excluded.nom_expediteur,
      actif = excluded.actif,
      updated_by = excluded.updated_by;
end;
$$;

grant execute on function public.fn_definir_parametres_smtp(text, integer, text, text, text, text, text, boolean) to authenticated;
