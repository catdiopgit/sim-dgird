-- v7.3 : notifications de circuit — l'agent affecté est notifié (acteur
-- 'destinataire_courant'), plus de doublons ni d'auto-notification.
\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';
create or replace function app.fn_notifier_transition()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_objet_module text;
  v_objet_id uuid;
  v_entite_objet uuid;
  v_etape_libelle text;
  v_acteur record;
  v_destinataire uuid;
  v_agent uuid;
  v_tour_agent boolean := false;
  v_notifies uuid[] := '{}';
begin
  if new.transition_id is null then
    return new;
  end if;

  select id, entite_id into v_objet_id, v_entite_objet
  from public.courriers where workflow_instance_id = new.workflow_instance_id;
  if found then
    v_objet_module := 'courrier';
  else
    select id, entite_id into v_objet_id, v_entite_objet
    from public.ged_versements where workflow_instance_id = new.workflow_instance_id;
    if found then
      v_objet_module := 'ged';
    else
      select id, entite_id into v_objet_id, v_entite_objet
      from public.missions where workflow_instance_id = new.workflow_instance_id;
      if found then
        v_objet_module := 'missions';
      end if;
    end if;
  end if;

  if v_objet_id is null then
    return new;
  end if;

  select libelle into v_etape_libelle from public.workflow_etapes where id = new.etape_suivante_id;

  -- Recette 2026-11 : agent affecté (acteur 'destinataire_courant').
  if v_objet_module = 'courrier' then
    select agent_destinataire_id into v_agent from public.courriers where id = v_objet_id;
  end if;
  -- C'est le tour de l'agent quand toutes les transitions sortantes l'ont pour acteur :
  -- on ne notifie alors que lui (le responsable suit via « À suivre »).
  if v_agent is not null then
    select bool_and(exists (
             select 1 from public.workflow_transition_roles r
             where r.workflow_transition_id = wt.id and r.type_acteur = 'destinataire_courant'))
      into v_tour_agent
    from public.workflow_transitions wt
    where wt.etape_source_id = new.etape_suivante_id;
    v_tour_agent := coalesce(v_tour_agent, false);
  end if;

  for v_acteur in
    select distinct wtr.*
    from public.workflow_transitions wt
    join public.workflow_transition_roles wtr on wtr.workflow_transition_id = wt.id
    where wt.etape_source_id = new.etape_suivante_id
      and (not v_tour_agent or wtr.type_acteur = 'destinataire_courant')
  loop
    for v_destinataire in
      select u.id from public.utilisateurs u
      where (v_acteur.type_acteur = 'role' and exists (
              select 1 from public.utilisateur_roles ur
              where ur.utilisateur_id = u.id and ur.role_id = v_acteur.role_id
                and (ur.date_fin is null or ur.date_fin >= current_date)
            ))
         or (v_acteur.type_acteur = 'fonction' and u.fonction_id = v_acteur.fonction_id)
         or (v_acteur.type_acteur = 'entite' and u.entite_id = v_acteur.entite_id)
         or (v_acteur.type_acteur = 'entite_et_descendants' and exists (
              select 1 from public.entites cible
              join public.entites racine on racine.id = v_acteur.entite_id
              where cible.id = u.entite_id and racine.chemin @> cible.chemin
            ))
         or (v_acteur.type_acteur = 'utilisateur' and u.id = v_acteur.utilisateur_id)
         or (v_acteur.type_acteur = 'responsable_entite_courante' and v_entite_objet is not null and exists (
              select 1 from public.entites e where e.id = v_entite_objet and e.responsable_utilisateur_id = u.id
            ))
         or (v_acteur.type_acteur = 'destinataire_courant' and v_agent is not null and u.id = v_agent)
         or (v_acteur.type_acteur = 'receptrice_deleguee_entite_courante' and v_entite_objet is not null and exists (
              select 1 from public.entites e where e.id = v_entite_objet and e.personne_receptrice_id = u.id
                and e.receptrice_peut_affecter
            ))
         or (v_acteur.type_acteur = 'superieur_hierarchique_courant' and v_entite_objet is not null and exists (
              select 1 from public.entites e join public.entites parent on parent.id = e.parent_entite_id
              where e.id = v_entite_objet and parent.responsable_utilisateur_id = u.id
            ))
    loop
      -- Ni l'auteur de l'action, ni deux fois la même personne.
      continue when v_destinataire = new.utilisateur_id or v_destinataire = any(v_notifies);
      v_notifies := v_notifies || v_destinataire;
      insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
      values (
        v_destinataire,
        (select id from public.modules where code = v_objet_module),
        'Action requise : ' || coalesce(v_etape_libelle, ''),
        new.commentaire,
        v_objet_module,
        v_objet_id
      );
    end loop;
  end loop;

  if v_objet_module = 'courrier' then
    perform app.fn_notifier_destinataires_courrier(
      v_objet_id,
      'Mise à jour : ' || coalesce(v_etape_libelle, ''),
      new.commentaire,
      new.utilisateur_id,
      false
    );
  end if;

  return new;
end;
$$;
