-- Gestion des courriers V4 (étape 2/7, cf. plan) : l'imputation doit
-- respecter strictement l'organigramme — un utilisateur ne peut imputer un
-- courrier qu'aux entités sur lesquelles il a la permission courrier/affecter
-- (portée organisation ou entite_et_descendants, déjà implémentée avec ltree
-- @> dans app.has_permission, 0004/0020). Résolution dynamique, pas de liste
-- statique : un responsable de Direction A ne voit que Direction A et ses
-- descendants ; le DG (portée organisation ou racine) voit tout.

create or replace function app.fn_entites_imputables()
returns setof public.entites
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  return query
  select e.*
  from public.entites e
  where e.organisation_id = app.current_organisation_id()
    and e.actif
    and app.has_permission('courrier', 'affecter', e.id);
end;
$$;

create or replace function public.fn_entites_imputables()
returns setof public.entites
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from app.fn_entites_imputables();
$$;

grant execute on function public.fn_entites_imputables() to authenticated;

-- Revalidation serveur dans fn_imputer_courrier (défense en profondeur — le
-- filtrage de l'UI, basé sur la même fonction, ne suffit pas à lui seul).
-- Signature inchangée par rapport à 0033.
create or replace function public.fn_imputer_courrier(
  p_courrier_id uuid,
  p_entite_id uuid,
  p_agent_id uuid default null,
  p_instruction text default null,
  p_echeance date default null,
  p_transition_id uuid default null,
  p_commentaire text default null
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_courrier record;
  v_entite_avant uuid;
  v_personne_receptrice_id uuid;
  v_module_courrier_id uuid;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  if not (
    v_courrier.created_by = auth.uid()
    or app.has_permission('courrier', 'modifier', v_courrier.entite_id)
  ) then
    raise exception 'Permission refusée sur le courrier %', p_courrier_id;
  end if;

  -- Périmètre hiérarchique: l'entité cible doit être dans le périmètre de
  -- l'appelant, indépendamment de son accès en modification au courrier lui-même.
  if not app.has_permission('courrier', 'affecter', p_entite_id) then
    raise exception 'Entité % hors du périmètre hiérarchique de l''appelant', p_entite_id;
  end if;

  v_entite_avant := v_courrier.entite_id;

  update public.courriers
  set entite_id = p_entite_id,
      agent_destinataire_id = p_agent_id
  where id = p_courrier_id
  returning * into v_courrier;

  insert into public.courrier_destinataires (
    courrier_id, entite_id, utilisateur_id, type_diffusion, instruction, echeance
  ) values (
    p_courrier_id, p_entite_id, p_agent_id, 'principal', p_instruction, p_echeance
  );

  select personne_receptrice_id into v_personne_receptrice_id
  from public.entites where id = p_entite_id;

  if v_personne_receptrice_id is not null then
    insert into public.courrier_destinataires (courrier_id, utilisateur_id, type_diffusion)
    values (p_courrier_id, v_personne_receptrice_id, 'copie');

    select id into v_module_courrier_id from public.modules where code = 'courrier';

    insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
    values (
      v_personne_receptrice_id,
      v_module_courrier_id,
      'Courrier imputé : ' || coalesce(v_courrier.numero, v_courrier.objet),
      'Vous êtes la personne réceptrice de l''entité à laquelle ce courrier vient d''être imputé.',
      'courrier',
      p_courrier_id
    );
  end if;

  if p_transition_id is not null then
    if v_courrier.workflow_instance_id is null then
      raise exception 'Courrier % sans instance de workflow', p_courrier_id;
    end if;
    perform app.fn_executer_transition(
      v_courrier.workflow_instance_id, p_transition_id, auth.uid(), p_commentaire, v_entite_avant
    );
  end if;

  return v_courrier;
end;
$$;
