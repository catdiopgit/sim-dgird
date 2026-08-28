-- Organisation, types d'entités et arbre d'entités à profondeur variable.
-- La hiérarchie (Organisation > Direction > Département > Service > Bureau > ...)
-- n'est jamais codée en dur: c'est un arbre auto-référencé, `type_entites` ne fait
-- que nommer les niveaux utilisés par une organisation donnée.

create table public.organisations (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  nom text not null,
  description text,
  logo_url text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_organisations_updated_at
  before update on public.organisations
  for each row execute function app.set_updated_at();

create table public.type_entites (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  code text not null,
  libelle text not null,
  ordre integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create trigger trg_type_entites_updated_at
  before update on public.type_entites
  for each row execute function app.set_updated_at();

create table public.entites (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  parent_entite_id uuid references public.entites(id) on delete restrict,
  type_entite_id uuid not null references public.type_entites(id),
  code text not null,
  libelle text not null,
  sigle text,
  -- FK ajoutée en 0003_utilisateurs_roles_permissions.sql (dépendance circulaire entites <-> utilisateurs).
  responsable_utilisateur_id uuid,
  chemin extensions.ltree,
  niveau integer not null default 0,
  ordre integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create index idx_entites_organisation on public.entites(organisation_id);
create index idx_entites_parent on public.entites(parent_entite_id);
create index idx_entites_chemin on public.entites using gist(chemin);

create trigger trg_entites_updated_at
  before update on public.entites
  for each row execute function app.set_updated_at();

-- Maintient `chemin` (ltree) et `niveau` à partir de `parent_entite_id`.
-- Limite connue: déplacer un sous-arbre (UPDATE parent_entite_id d'une entité qui a
-- déjà des enfants) ne recalcule pas récursivement le chemin des descendants. Ce cas
-- n'est pas requis pour la Phase 2 (pas de réorganisation dynamique prévue).
create or replace function app.set_entite_chemin()
returns trigger
language plpgsql
as $$
declare
  v_parent_chemin extensions.ltree;
  v_parent_niveau integer;
  v_label text;
begin
  v_label := replace(new.id::text, '-', '_');

  if new.parent_entite_id is null then
    new.chemin := v_label::extensions.ltree;
    new.niveau := 0;
  else
    select chemin, niveau into v_parent_chemin, v_parent_niveau
    from public.entites
    where id = new.parent_entite_id;

    if v_parent_chemin is null then
      raise exception 'Entité parente % introuvable ou sans chemin', new.parent_entite_id;
    end if;

    new.chemin := v_parent_chemin || v_label::extensions.ltree;
    new.niveau := v_parent_niveau + 1;
  end if;

  return new;
end;
$$;

create trigger trg_entites_set_chemin
  before insert or update of parent_entite_id on public.entites
  for each row execute function app.set_entite_chemin();

create table public.fonctions (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  code text not null,
  libelle text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create trigger trg_fonctions_updated_at
  before update on public.fonctions
  for each row execute function app.set_updated_at();
