-- Gestion des courriers — Version 5, correctif : fn_imputer_courrier vérifiait
-- inconditionnellement has_permission('courrier','affecter', ...), y compris
-- pour transmission/redirection — alors que le plan validé (§H) prévoit une
-- action distincte 'transmettre' précisément pour qu'un rôle autorisé à
-- imputer ne soit pas automatiquement autorisé à transmettre à des personnes
-- hors périmètre d'affectation. Corrige ce dernier avant toute utilisation
-- réelle (aucune donnée ne dépend encore de l'ancien comportement).
--
-- Corrige aussi fn_personnes_transmissibles: retournait un setof uuid sans
-- indiquer l'entité de rattachement de chaque personne, alors que le plan
-- (§B) prévoit que choisir une personne dérive automatiquement son entité de
-- rattachement comme p_entite_id — nécessite de retourner les deux.

drop function if exists app.fn_personnes_transmissibles();
drop function if exists public.fn_personnes_transmissibles();

create function app.fn_personnes_transmissibles()
returns table (utilisateur_id uuid, entite_id uuid)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  return query
  select distinct e.responsable_utilisateur_id, e.id
  from public.entites e
  where e.organisation_id = app.current_organisation_id()
    and e.actif
    and e.responsable_utilisateur_id is not null
    and app.has_permission('courrier', 'transmettre', e.id)
  union
  select parent.responsable_utilisateur_id, parent.id
  from public.utilisateurs u
  join public.entites e on e.id = u.entite_id
  join public.entites parent on parent.id = e.parent_entite_id
  where u.id = auth.uid()
    and parent.responsable_utilisateur_id is not null;
end;
$$;

create function public.fn_personnes_transmissibles()
returns table (utilisateur_id uuid, entite_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from app.fn_personnes_transmissibles();
$$;

grant execute on function public.fn_personnes_transmissibles() to authenticated;

create or replace function public.fn_imputer_courrier(
  p_courrier_id uuid,
  p_entite_id uuid,
  p_agent_id uuid default null,
  p_instruction text default null,
  p_echeance date default null,
  p_transition_id uuid default null,
  p_commentaire text default null,
  p_type_action public.type_action_courrier default null,
  p_entites_copie_ids uuid[] default null,
  p_actions_demandees_ids uuid[] default null,
  p_priorite_valeur_id uuid default null
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
  v_destinataire_principal_id uuid;
  v_destinataire_ids uuid[] := '{}';
  v_destinataire_copie_id uuid;
  v_historique_id uuid;
  v_entite_copie_id uuid;
  v_action_demandee_id uuid;
  v_action_permission text;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  if v_courrier.verrouille_le is not null then
    raise exception 'Courrier % verrouillé (décharge ajoutée) — imputation impossible', p_courrier_id;
  end if;

  if not (
    v_courrier.created_by = auth.uid()
    or app.has_permission('courrier', 'modifier', v_courrier.entite_id)
  ) then
    raise exception 'Permission refusée sur le courrier %', p_courrier_id;
  end if;

  if p_type_action is not null and v_courrier.sens <> 'entrant' then
    raise exception 'Action % réservée aux courriers entrants', p_type_action;
  end if;

  -- Transmission/Redirection: action distincte 'transmettre', pas héritée de
  -- 'affecter' (V5 §18 — droits basés sur le rôle, pas sur l'imputation).
  v_action_permission := case
    when p_type_action in ('transmission', 'redirection') then 'transmettre'
    else 'affecter'
  end;

  if not app.has_permission('courrier', v_action_permission, p_entite_id) then
    raise exception 'Entité % hors du périmètre autorisé (%) de l''appelant', p_entite_id, v_action_permission;
  end if;

  v_entite_avant := v_courrier.entite_id;

  if p_type_action is distinct from 'transmission' then
    update public.courriers
    set entite_id = p_entite_id,
        agent_destinataire_id = p_agent_id
    where id = p_courrier_id
    returning * into v_courrier;
  end if;

  if p_priorite_valeur_id is not null then
    update public.courriers
    set priorite_valeur_id = p_priorite_valeur_id
    where id = p_courrier_id
    returning * into v_courrier;
  end if;

  insert into public.courrier_destinataires (
    courrier_id, entite_id, utilisateur_id, type_diffusion, instruction, echeance, type_action
  ) values (
    p_courrier_id, p_entite_id, p_agent_id, 'principal', p_instruction, p_echeance, p_type_action
  )
  returning id into v_destinataire_principal_id;

  v_destinataire_ids := array_append(v_destinataire_ids, v_destinataire_principal_id);

  if p_entites_copie_ids is not null then
    foreach v_entite_copie_id in array p_entites_copie_ids loop
      if not app.has_permission('courrier', 'affecter', v_entite_copie_id) then
        raise exception 'Entité en copie % hors du périmètre hiérarchique de l''appelant', v_entite_copie_id;
      end if;
      insert into public.courrier_destinataires (courrier_id, entite_id, type_diffusion)
      values (p_courrier_id, v_entite_copie_id, 'copie')
      returning id into v_destinataire_copie_id;
      v_destinataire_ids := array_append(v_destinataire_ids, v_destinataire_copie_id);
    end loop;
  end if;

  if p_actions_demandees_ids is not null then
    foreach v_action_demandee_id in array p_actions_demandees_ids loop
      insert into public.courrier_destinataire_actions (courrier_destinataire_id, valeur_liste_id)
      values (v_destinataire_principal_id, v_action_demandee_id)
      on conflict do nothing;
    end loop;
  end if;

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

    select app.fn_executer_transition(
      v_courrier.workflow_instance_id, p_transition_id, auth.uid(), p_commentaire, v_entite_avant
    ) into v_historique_id;

    update public.courrier_destinataires
    set workflow_historique_id = v_historique_id
    where id = any(v_destinataire_ids);
  end if;

  return v_courrier;
end;
$$;
