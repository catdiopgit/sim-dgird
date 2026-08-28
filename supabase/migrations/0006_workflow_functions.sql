-- Fonctions pilotant le moteur de workflow. Ce sont les seuls points d'écriture
-- autorisés sur workflow_instances/workflow_historique: l'écriture directe est
-- révoquée pour le rôle `authenticated` en fin de fichier.
--
-- Note: app.fn_demarrer_workflow référence workflow_definition_associations,
-- créée seulement en 0007_parametrage_generique.sql. C'est valide: le corps
-- plpgsql n'est vérifié contre le schéma qu'au premier appel, jamais à la
-- création de la fonction, et par construction aucun appel ne peut avoir lieu
-- avant que toutes les migrations soient appliquées.

create or replace function app.fn_demarrer_workflow(
  p_module_code text,
  p_organisation_id uuid,
  p_utilisateur_id uuid,
  p_valeur_liste_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_module_id uuid;
  v_definition_id uuid;
  v_etape_initiale_id uuid;
  v_instance_id uuid;
begin
  select id into v_module_id from public.modules where code = p_module_code;
  if v_module_id is null then
    raise exception 'Module % introuvable', p_module_code;
  end if;

  if p_valeur_liste_id is not null then
    select wda.workflow_definition_id into v_definition_id
    from public.workflow_definition_associations wda
    join public.workflow_definitions wd on wd.id = wda.workflow_definition_id
    where wda.valeur_liste_id = p_valeur_liste_id
      and wd.organisation_id = p_organisation_id
      and wd.module_id = v_module_id
      and wd.actif
    limit 1;
  end if;

  if v_definition_id is null then
    select id into v_definition_id
    from public.workflow_definitions
    where organisation_id = p_organisation_id
      and module_id = v_module_id
      and est_defaut
      and actif
    limit 1;
  end if;

  if v_definition_id is null then
    raise exception 'Aucune définition de workflow active pour le module % (organisation %)', p_module_code, p_organisation_id;
  end if;

  select id into v_etape_initiale_id
  from public.workflow_etapes
  where workflow_definition_id = v_definition_id
    and type_etape = 'initiale'
  limit 1;

  if v_etape_initiale_id is null then
    raise exception 'Le workflow % n''a pas d''étape initiale', v_definition_id;
  end if;

  insert into public.workflow_instances (workflow_definition_id, etape_courante_id, created_by)
  values (v_definition_id, v_etape_initiale_id, p_utilisateur_id)
  returning id into v_instance_id;

  insert into public.workflow_historique (workflow_instance_id, etape_precedente_id, etape_suivante_id, utilisateur_id, commentaire)
  values (v_instance_id, null, v_etape_initiale_id, p_utilisateur_id, 'Démarrage du workflow');

  return v_instance_id;
end;
$$;

create or replace function app.fn_executer_transition(
  p_instance_id uuid,
  p_transition_id uuid,
  p_utilisateur_id uuid,
  p_commentaire text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_instance record;
  v_transition record;
  v_role_requis boolean;
  v_role_autorise boolean;
  v_nouveau_statut public.statut_instance_workflow;
begin
  select * into v_instance from public.workflow_instances where id = p_instance_id for update;
  if not found then
    raise exception 'Instance de workflow % introuvable', p_instance_id;
  end if;

  if v_instance.statut_instance <> 'en_cours' then
    raise exception 'Le workflow % n''est plus en cours (statut: %)', p_instance_id, v_instance.statut_instance;
  end if;

  select * into v_transition from public.workflow_transitions where id = p_transition_id;
  if not found then
    raise exception 'Transition % introuvable', p_transition_id;
  end if;

  if v_transition.workflow_definition_id <> v_instance.workflow_definition_id then
    raise exception 'La transition % n''appartient pas à la définition de workflow de l''instance', p_transition_id;
  end if;

  if v_transition.etape_source_id is not null and v_transition.etape_source_id <> v_instance.etape_courante_id then
    raise exception 'Transition % non valide depuis l''étape courante %', p_transition_id, v_instance.etape_courante_id;
  end if;

  select exists (select 1 from public.workflow_transition_roles where workflow_transition_id = p_transition_id)
    into v_role_requis;

  if v_role_requis then
    select exists (
      select 1
      from public.workflow_transition_roles wtr
      join public.utilisateur_roles ur on ur.role_id = wtr.role_id
      where wtr.workflow_transition_id = p_transition_id
        and ur.utilisateur_id = p_utilisateur_id
        and (ur.date_fin is null or ur.date_fin >= current_date)
    ) into v_role_autorise;

    if not v_role_autorise then
      raise exception 'Utilisateur % non autorisé pour la transition %', p_utilisateur_id, p_transition_id;
    end if;
  end if;

  insert into public.workflow_historique (workflow_instance_id, transition_id, etape_precedente_id, etape_suivante_id, utilisateur_id, commentaire)
  values (p_instance_id, p_transition_id, v_instance.etape_courante_id, v_transition.etape_cible_id, p_utilisateur_id, p_commentaire);

  select case
    when we.type_etape in ('finale', 'rejet') then 'terminee'::public.statut_instance_workflow
    else 'en_cours'::public.statut_instance_workflow
  end
  into v_nouveau_statut
  from public.workflow_etapes we
  where we.id = v_transition.etape_cible_id;

  update public.workflow_instances
  set etape_courante_id = v_transition.etape_cible_id,
      statut_instance = v_nouveau_statut,
      termine_le = case when v_nouveau_statut = 'terminee' then now() else termine_le end
  where id = p_instance_id;
end;
$$;

-- Défense en profondeur: seules ces fonctions (SECURITY DEFINER) peuvent faire
-- progresser un workflow. RLS (0014+) protège séparément la lecture.
revoke insert, update, delete on public.workflow_instances from authenticated;
revoke insert, update, delete on public.workflow_historique from authenticated;

grant execute on function app.fn_demarrer_workflow(text, uuid, uuid, uuid) to authenticated;
grant execute on function app.fn_executer_transition(uuid, uuid, uuid, text) to authenticated;
