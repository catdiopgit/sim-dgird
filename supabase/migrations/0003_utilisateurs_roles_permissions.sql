-- Utilisateurs applicatifs, rôles, et matrice de permissions module x action.

create table public.utilisateurs (
  id uuid primary key references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  entite_id uuid references public.entites(id) on delete set null,
  matricule text,
  nom text not null,
  prenom text not null,
  email text not null,
  telephone text,
  fonction_id uuid references public.fonctions(id) on delete set null,
  photo_url text,
  statut text not null default 'actif' check (statut in ('actif', 'inactif', 'suspendu')),
  date_entree date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_utilisateurs_organisation on public.utilisateurs(organisation_id);
create index idx_utilisateurs_entite on public.utilisateurs(entite_id);

create trigger trg_utilisateurs_updated_at
  before update on public.utilisateurs
  for each row execute function app.set_updated_at();

-- Dépendance circulaire entites <-> utilisateurs résolue ici: la colonne existe
-- depuis 0002, on ajoute la contrainte de clé étrangère maintenant.
alter table public.entites
  add constraint entites_responsable_utilisateur_fk
  foreign key (responsable_utilisateur_id) references public.utilisateurs(id) on delete set null;

create table public.roles (
  id uuid primary key default extensions.gen_random_uuid(),
  -- organisation_id null = rôle système partagé (ex. Administrateur), protégé par `systeme`.
  organisation_id uuid references public.organisations(id) on delete cascade,
  code text not null,
  libelle text not null,
  description text,
  systeme boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, code)
);

-- Le UNIQUE ci-dessus ne bloque pas les doublons quand organisation_id est NULL
-- (NULL n'est jamais égal à NULL). Index partiel dédié pour les rôles système.
create unique index idx_roles_code_systeme on public.roles(code) where organisation_id is null;

create trigger trg_roles_updated_at
  before update on public.roles
  for each row execute function app.set_updated_at();

create table public.utilisateur_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  utilisateur_id uuid not null references public.utilisateurs(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  -- entite_id null = attribution à portée organisation entière.
  entite_id uuid references public.entites(id) on delete cascade,
  date_debut date not null default current_date,
  date_fin date,
  created_at timestamptz not null default now(),
  unique (utilisateur_id, role_id, entite_id)
);

-- Même remarque que pour roles: index partiel pour éviter les doublons quand
-- l'attribution est à portée organisation (entite_id null).
create unique index idx_utilisateur_roles_global on public.utilisateur_roles(utilisateur_id, role_id)
  where entite_id is null;

create index idx_utilisateur_roles_utilisateur on public.utilisateur_roles(utilisateur_id);
create index idx_utilisateur_roles_entite on public.utilisateur_roles(entite_id);

create table public.modules (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  libelle text not null,
  icone text,
  ordre integer not null default 0,
  actif boolean not null default true
);

create table public.actions (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  libelle text not null
);

create type public.portee_permission as enum (
  'organisation',
  'entite',
  'entite_et_descendants',
  'personnel'
);

create table public.permissions (
  id uuid primary key default extensions.gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  action_id uuid not null references public.actions(id) on delete cascade,
  portee public.portee_permission not null default 'entite',
  created_at timestamptz not null default now(),
  unique (role_id, module_id, action_id)
);

create index idx_permissions_role on public.permissions(role_id);
