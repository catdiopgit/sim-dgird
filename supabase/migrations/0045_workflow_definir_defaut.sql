-- Le bouton "Définir par défaut" (WorkflowsTab) faisait un update direct
-- est_defaut=true sur la ligne choisie, sans désactiver l'ancien défaut.
-- Comme idx_workflow_definitions_defaut (0005) impose un seul est_defaut=true
-- par (organisation_id, module_id), changer de workflow par défaut quand un
-- autre l'était déjà levait une violation de contrainte unique. On fournit
-- une fonction qui bascule l'ancien et le nouveau défaut dans une même
-- transaction.

create or replace function public.fn_definir_workflow_defaut(p_workflow_definition_id uuid)
returns public.workflow_definitions
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_module_id uuid;
  v_result public.workflow_definitions;
begin
  select organisation_id, module_id
  into v_organisation_id, v_module_id
  from public.workflow_definitions
  where id = p_workflow_definition_id;

  if v_organisation_id is null then
    raise exception 'Workflow introuvable';
  end if;

  if v_organisation_id <> app.current_organisation_id() then
    raise exception 'Workflow hors organisation';
  end if;

  if not app.has_permission('administration', 'modifier') then
    raise exception 'Permission refusée (administration/modifier)';
  end if;

  update public.workflow_definitions
  set est_defaut = false
  where organisation_id = v_organisation_id
    and module_id = v_module_id
    and est_defaut
    and id <> p_workflow_definition_id;

  update public.workflow_definitions
  set est_defaut = true
  where id = p_workflow_definition_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.fn_definir_workflow_defaut(uuid) to authenticated;
