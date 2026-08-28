-- Extensions et utilitaires transverses.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists ltree with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists app;

-- Trigger générique: maintient updated_at à jour sur toute table qui l'utilise.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
