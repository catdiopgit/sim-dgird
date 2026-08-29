-- Stub minimal des schémas/rôles Supabase (auth, storage) + fix search_path.
--
-- Contexte (voir MIGRATION.md, Phase 0) : les 82 fichiers de
-- supabase/migrations/ ont été écrits pour tourner sur une instance Supabase,
-- qui fournit nativement les schémas `auth`/`storage`, quelques fonctions de
-- session (auth.uid()/role()/jwt()) et les rôles authenticated/anon/
-- service_role. Sur un Postgres "nu" (VPS, poste local), ces migrations ne
-- s'appliquent pas telles quelles : ce script recrée le strict minimum
-- (tables/fonctions/rôles réellement référencés par les migrations et leurs
-- policies RLS d'origine — jamais utilisées par le backend NestJS, RLS
-- désactivée par décision, mais les migrations les créent quand même) pour
-- pouvoir les rejouer sans modification.
--
-- Usage : à exécuter UNE SEULE FOIS, juste après avoir créé la base et AVANT
-- de rejouer supabase/migrations/*.sql (dans l'ordre numérique) :
--   psql -U postgres -d <nom_base> -f server/scripts/supabase-schema-stub.sql
--
-- Ce script ne fait rien avec les vraies données Supabase — il ne doit
-- jamais être exécuté contre une vraie instance Supabase (auth.users y
-- existe déjà réellement, avec de vrais comptes).

create schema if not exists auth;
create schema if not exists storage;
-- `create extension ... with schema extensions` (0001_extensions.sql) exige
-- que le schéma existe déjà, il ne le crée pas lui-même.
create schema if not exists extensions;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  encrypted_password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  path_tokens text[],
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fonctions de session Supabase, jamais réellement invoquées en production
-- (RLS désactivée, décision MIGRATION.md §b) mais référencées par les
-- policies créées par certaines migrations.
create or replace function auth.uid() returns uuid
language sql stable as $$ select null::uuid $$;

create or replace function auth.role() returns text
language sql stable as $$ select 'authenticated'::text $$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$ select '{}'::jsonb $$;

create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1]
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end
$$;

-- Fix search_path : sans `extensions` dedans, l'opérateur ltree `||` (utilisé
-- par le trigger app.set_entite_chemin) et les appels non qualifiés à
-- gen_random_uuid() échouent selon le search_path effectif de la session/
-- connexion. Bug latent trouvé en Phase 7 (voir MIGRATION.md), corrigé ici
-- une fois pour toutes au niveau de la base plutôt qu'en SET de session.
do $$
begin
  execute format('alter database %I set search_path = "$user", public, extensions', current_database());
end
$$;
