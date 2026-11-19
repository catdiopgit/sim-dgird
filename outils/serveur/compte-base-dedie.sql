-- SIM-DGIRD — compte de base dédié (v8.6.6)
-- Exécuté par securiser-lot2.ps1 avec le compte postgres. Variables psql :
--   :base (nom de la base) et :'mdp' (mot de passe du compte sim_app).
-- Le compte sim_app devient propriétaire des objets de l'application (ce
-- qui lui permet les évolutions de schéma au démarrage) mais n'est PAS
-- super-utilisateur : il ne peut ni créer de base, ni de rôle, ni lire les
-- autres bases du serveur.
\set ON_ERROR_STOP on
select format('create role sim_app login password %L', :'mdp')
 where not exists (select 1 from pg_roles where rolname = 'sim_app') \gexec
select format('alter role sim_app with login password %L nosuperuser nocreatedb nocreaterole', :'mdp') \gexec

grant connect, temporary on database :"base" to sim_app;
grant usage, create on schema public to sim_app;
do $$
declare s text; r record;
begin
  foreach s in array array['app', 'auth', 'storage', 'extensions'] loop
    if exists (select 1 from pg_namespace where nspname = s) then
      execute format('grant usage on schema %I to sim_app', s);
    end if;
  end loop;
  if exists (select 1 from pg_namespace where nspname = 'app') then
    execute 'grant create on schema app to sim_app';
  end if;
  -- Tables, vues, séquences de l'application → propriétaire sim_app
  for r in
    select n.nspname, c.relname, c.relkind
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'app', 'auth', 'storage')
      and c.relkind in ('r', 'v', 'm', 'S', 'p')
      and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
      and not (c.relkind = 'S' and exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype in ('a', 'i')))
  loop
    execute format(
      'alter %s %I.%I owner to sim_app',
      case r.relkind when 'v' then 'view' when 'm' then 'materialized view' when 'S' then 'sequence' else 'table' end,
      r.nspname, r.relname);
  end loop;
end $$;
grant execute on all functions in schema public to sim_app;
grant execute on all functions in schema app to sim_app;
grant execute on all functions in schema extensions to sim_app;
grant select, insert, update, delete on all tables in schema app to sim_app;
grant usage, select, update on all sequences in schema public to sim_app;
select 'OK compte sim_app pret' as resultat;
