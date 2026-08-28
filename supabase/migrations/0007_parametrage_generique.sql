-- Paramétrage générique: remplace la dizaine de tables de lookup quasi identiques
-- (types de courrier, priorités, confidentialité, statuts...) par une seule paire
-- de tables catalogue/valeurs, + numérotation automatique paramétrable.

create table public.listes_valeurs (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  code text not null,
  libelle text not null,
  -- module_id null = liste partagée entre modules (ex. confidentialité: courrier + GED).
  module_id uuid references public.modules(id) on delete set null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create trigger trg_listes_valeurs_updated_at
  before update on public.listes_valeurs
  for each row execute function app.set_updated_at();

create table public.valeurs_listes (
  id uuid primary key default extensions.gen_random_uuid(),
  liste_id uuid not null references public.listes_valeurs(id) on delete cascade,
  code text not null,
  libelle text not null,
  description text,
  couleur text,
  ordre integer not null default 0,
  valeur_defaut boolean not null default false,
  actif boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (liste_id, code)
);

create unique index idx_valeurs_listes_defaut on public.valeurs_listes(liste_id) where valeur_defaut;

create trigger trg_valeurs_listes_updated_at
  before update on public.valeurs_listes
  for each row execute function app.set_updated_at();

create type public.reinitialisation_numerotation as enum ('annuelle', 'mensuelle', 'jamais');

create table public.regles_numerotation (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  -- entite_id/valeur_liste_id null = règle par défaut à portée organisation/module.
  entite_id uuid references public.entites(id) on delete cascade,
  valeur_liste_id uuid references public.valeurs_listes(id) on delete cascade,
  format text not null,
  sequence_courante integer not null default 0,
  reinitialisation public.reinitialisation_numerotation not null default 'annuelle',
  derniere_reinitialisation_le date,
  updated_at timestamptz not null default now()
);

-- Unicité fonctionnelle: NULL est traité comme une valeur normale ici (via coalesce
-- sur un sentinel), contrairement au comportement par défaut d'un UNIQUE standard.
create unique index idx_regles_numerotation_uk on public.regles_numerotation (
  organisation_id,
  module_id,
  coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(valeur_liste_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create table public.modeles_courrier (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  valeur_liste_id uuid references public.valeurs_listes(id) on delete set null,
  nom text not null,
  contenu text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_modeles_courrier_updated_at
  before update on public.modeles_courrier
  for each row execute function app.set_updated_at();

create table public.parametres_organisation (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  cle text not null,
  valeur jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  unique (organisation_id, cle)
);

create trigger trg_parametres_organisation_updated_at
  before update on public.parametres_organisation
  for each row execute function app.set_updated_at();

-- Lie un type/catégorie précis (valeur_liste) à une définition de workflow
-- spécifique. Sans association, app.fn_demarrer_workflow retombe sur le workflow
-- marqué est_defaut du module.
create table public.workflow_definition_associations (
  id uuid primary key default extensions.gen_random_uuid(),
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  valeur_liste_id uuid not null references public.valeurs_listes(id) on delete cascade,
  unique (valeur_liste_id)
);

-- Génère un numéro selon le gabarit de regles_numerotation ({ANNEE}, {MOIS},
-- {SEQ} ou {SEQ:n} pour un zero-padding à n chiffres). SELECT ... FOR UPDATE
-- verrouille la ligne de règle pour rester correct sous création concurrente.
create or replace function app.fn_generer_numero(
  p_organisation_id uuid,
  p_module_code text,
  p_entite_id uuid default null,
  p_valeur_liste_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_module_id uuid;
  v_regle record;
  v_annee text := to_char(current_date, 'YYYY');
  v_mois text := to_char(current_date, 'MM');
  v_doit_reinitialiser boolean := false;
  v_numero text;
  v_largeur int;
begin
  select id into v_module_id from public.modules where code = p_module_code;
  if v_module_id is null then
    raise exception 'Module % introuvable', p_module_code;
  end if;

  select * into v_regle
  from public.regles_numerotation
  where organisation_id = p_organisation_id
    and module_id = v_module_id
    and coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_entite_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(valeur_liste_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_valeur_liste_id, '00000000-0000-0000-0000-000000000000'::uuid)
  for update;

  if not found then
    select * into v_regle
    from public.regles_numerotation
    where organisation_id = p_organisation_id
      and module_id = v_module_id
      and entite_id is null
      and valeur_liste_id is null
    for update;
  end if;

  if not found then
    raise exception 'Aucune règle de numérotation pour le module % (organisation %)', p_module_code, p_organisation_id;
  end if;

  if v_regle.reinitialisation = 'annuelle' then
    v_doit_reinitialiser := v_regle.derniere_reinitialisation_le is null
      or date_trunc('year', v_regle.derniere_reinitialisation_le) <> date_trunc('year', current_date);
  elsif v_regle.reinitialisation = 'mensuelle' then
    v_doit_reinitialiser := v_regle.derniere_reinitialisation_le is null
      or date_trunc('month', v_regle.derniere_reinitialisation_le) <> date_trunc('month', current_date);
  end if;

  update public.regles_numerotation
  set sequence_courante = case when v_doit_reinitialiser then 1 else sequence_courante + 1 end,
      derniere_reinitialisation_le = case when v_doit_reinitialiser then current_date else derniere_reinitialisation_le end,
      updated_at = now()
  where id = v_regle.id
  returning sequence_courante into v_regle.sequence_courante;

  v_numero := v_regle.format;
  v_numero := replace(v_numero, '{ANNEE}', v_annee);
  v_numero := replace(v_numero, '{MOIS}', v_mois);

  if v_numero ~ '\{SEQ:\d+\}' then
    v_largeur := substring(v_numero from '\{SEQ:(\d+)\}')::int;
    v_numero := regexp_replace(v_numero, '\{SEQ:\d+\}', lpad(v_regle.sequence_courante::text, v_largeur, '0'));
  else
    v_numero := replace(v_numero, '{SEQ}', v_regle.sequence_courante::text);
  end if;

  return v_numero;
end;
$$;

grant execute on function app.fn_generer_numero(uuid, text, uuid, uuid) to authenticated;
