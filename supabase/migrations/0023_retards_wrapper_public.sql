-- Pont public pour app.fn_detecter_et_notifier_retards (schéma `app` non
-- exposé par PostgREST, cf. 0019). Réservé à service_role: un utilisateur
-- authentifié classique n'a aucune raison de déclencher ce scan lui-même.

create or replace function public.fn_detecter_et_notifier_retards()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select app.fn_detecter_et_notifier_retards();
$$;

revoke execute on function public.fn_detecter_et_notifier_retards() from public, authenticated, anon;
grant execute on function public.fn_detecter_et_notifier_retards() to service_role;
