-- Moteur de workflow générique, réutilisé par courrier, GED et missions
-- (une seule définition de tables pour les trois domaines).

create table public.workflow_definitions (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  code text not null,
  libelle text not null,
  description text,
  version integer not null default 1,
  actif boolean not null default true,
  est_defaut boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, module_id, code)
);

-- Un seul workflow par défaut par (organisation, module).
create unique index idx_workflow_definitions_defaut
  on public.workflow_definitions(organisation_id, module_id)
  where est_defaut;

create trigger trg_workflow_definitions_updated_at
  before update on public.workflow_definitions
  for each row execute function app.set_updated_at();

create type public.type_etape_workflow as enum ('initiale', 'intermediaire', 'finale', 'rejet');

create table public.workflow_etapes (
  id uuid primary key default extensions.gen_random_uuid(),
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  code text not null,
  libelle text not null,
  ordre integer not null default 0,
  type_etape public.type_etape_workflow not null default 'intermediaire',
  delai_jours integer,
  couleur text,
  created_at timestamptz not null default now(),
  unique (workflow_definition_id, code)
);

-- Une seule étape initiale par définition (point de départ de fn_demarrer_workflow).
create unique index idx_workflow_etapes_initiale
  on public.workflow_etapes(workflow_definition_id)
  where type_etape = 'initiale';

create table public.workflow_transitions (
  id uuid primary key default extensions.gen_random_uuid(),
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  -- etape_source_id null = transition déclenchable depuis n'importe quelle étape.
  etape_source_id uuid references public.workflow_etapes(id) on delete cascade,
  etape_cible_id uuid not null references public.workflow_etapes(id) on delete cascade,
  code text not null,
  libelle_action text not null,
  condition jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_definition_id, code)
);

create index idx_workflow_transitions_source on public.workflow_transitions(etape_source_id);
create index idx_workflow_transitions_definition on public.workflow_transitions(workflow_definition_id);

-- Rôles autorisés à déclencher une transition. Une transition sans ligne ici est
-- ouverte à tout acteur ayant accès à l'objet (voir app.fn_executer_transition).
create table public.workflow_transition_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  workflow_transition_id uuid not null references public.workflow_transitions(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  unique (workflow_transition_id, role_id)
);

create type public.statut_instance_workflow as enum ('en_cours', 'terminee', 'annulee');

create table public.workflow_instances (
  id uuid primary key default extensions.gen_random_uuid(),
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete restrict,
  -- Pointeur dénormalisé vers l'étape courante, mis à jour uniquement par
  -- app.fn_executer_transition (voir 0006, écriture directe révoquée pour `authenticated`).
  etape_courante_id uuid not null references public.workflow_etapes(id) on delete restrict,
  statut_instance public.statut_instance_workflow not null default 'en_cours',
  demarre_le timestamptz not null default now(),
  termine_le timestamptz,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_workflow_instances_definition on public.workflow_instances(workflow_definition_id);
create index idx_workflow_instances_etape on public.workflow_instances(etape_courante_id);

-- Historique des transitions, source unique de vérité de l'audit de workflow
-- pour courrier, GED et missions (§5/§8/§12 du cahier des charges).
create table public.workflow_historique (
  id uuid primary key default extensions.gen_random_uuid(),
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  transition_id uuid references public.workflow_transitions(id) on delete set null,
  etape_precedente_id uuid references public.workflow_etapes(id) on delete set null,
  etape_suivante_id uuid not null references public.workflow_etapes(id) on delete restrict,
  utilisateur_id uuid references public.utilisateurs(id) on delete set null,
  commentaire text,
  date_action timestamptz not null default now()
);

create index idx_workflow_historique_instance on public.workflow_historique(workflow_instance_id);
