-- Fonctions utilitaires réutilisées par les policies RLS (migrations 0014+).
-- SECURITY DEFINER: ces fonctions doivent pouvoir lire utilisateurs/roles/permissions
-- même pour un appelant dont les policies RLS lui interdiraient l'accès direct à ces
-- tables. search_path fixé explicitement pour éviter tout hijacking de fonction.

create or replace function app.current_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select organisation_id from public.utilisateurs where id = auth.uid();
$$;

create or replace function app.current_entite_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select entite_id from public.utilisateurs where id = auth.uid();
$$;

-- Vrai si l'utilisateur courant possède, via un de ses rôles actifs, la permission
-- (module, action) avec une portée qui couvre p_entite_id (ou une portée organisation
-- / personnelle qui ne nécessite pas de comparaison d'entité).
create or replace function app.has_permission(p_module text, p_action text, p_entite_id uuid default null)
returns boolean
language plpgsql
stable
security definer
-- extensions requis: la portée 'entite_et_descendants' compare des colonnes ltree
-- via l'opérateur @>, fourni par l'extension ltree installée dans ce schéma.
set search_path = public, extensions, pg_temp
as $$
declare
  v_result boolean;
begin
  select true into v_result
  from public.utilisateur_roles ur
  join public.permissions p on p.role_id = ur.role_id
  join public.modules m on m.id = p.module_id and m.code = p_module
  join public.actions a on a.id = p.action_id and a.code = p_action
  left join public.entites ue on ue.id = ur.entite_id
  where ur.utilisateur_id = auth.uid()
    and (ur.date_fin is null or ur.date_fin >= current_date)
    and (
      p.portee = 'organisation'
      or p.portee = 'personnel'
      or (
        p_entite_id is not null
        and (
          (p.portee = 'entite' and ur.entite_id = p_entite_id)
          or (
            p.portee = 'entite_et_descendants'
            and ue.chemin is not null
            and exists (
              select 1 from public.entites cible
              where cible.id = p_entite_id
                and ue.chemin @> cible.chemin
            )
          )
        )
      )
    )
  limit 1;

  return coalesce(v_result, false);
end;
$$;
