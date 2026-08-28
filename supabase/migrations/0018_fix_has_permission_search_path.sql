-- Corrige app.has_permission: search_path = public, pg_temp (0004) excluait le
-- schéma extensions, où vit l'opérateur ltree @> utilisé pour la portée
-- 'entite_et_descendants'. Découvert en testant les policies RLS avec de vrais
-- utilisateurs (erreur: "operator does not exist: extensions.ltree @> extensions.ltree").

create or replace function app.has_permission(p_module text, p_action text, p_entite_id uuid default null)
returns boolean
language plpgsql
stable
security definer
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
