-- Gestion des courriers — Version 5 (actions de workflow modales), étape 1/6.
-- Transforme Affectation/Imputation/Transmission/Redirection en actions du
-- moteur de workflow existant (pas un mécanisme parallèle) : un seul point
-- d'entrée serveur étendu (fn_imputer_courrier), le type d'action porté par
-- la ligne courrier_destinataires "principal", et l'échéance saisie qui
-- alimente enfin la détection de retard (jusqu'ici jamais lue nulle part).

create type public.type_action_courrier as enum (
  'imputation', 'affectation', 'transmission', 'redirection'
);

alter table public.courrier_destinataires
  add column type_action public.type_action_courrier,
  add column workflow_historique_id uuid references public.workflow_historique(id) on delete set null;

-- "Actions demandées" (multi-select, imputation.png) : une table de jointure,
-- pas une colonne tableau — cohérent avec le reste du schéma qui n'utilise
-- jamais de colonne array (permissions, workflow_transition_roles, etc.).
create table public.courrier_destinataire_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  courrier_destinataire_id uuid not null references public.courrier_destinataires(id) on delete cascade,
  valeur_liste_id uuid not null references public.valeurs_listes(id) on delete cascade,
  unique (courrier_destinataire_id, valeur_liste_id)
);

alter table public.courrier_destinataire_actions enable row level security;

create policy courrier_destinataire_actions_select on public.courrier_destinataire_actions
  for select using (
    exists (
      select 1 from public.courrier_destinataires cd
      where cd.id = courrier_destinataire_actions.courrier_destinataire_id
        and app.can_view_courrier(cd.courrier_id)
    )
  );

-- Miroir exact de la policy courrier_destinataires_write (0038, verrouillage
-- inclus en WITH CHECK, pas seulement USING).
create policy courrier_destinataire_actions_write on public.courrier_destinataire_actions
  for all using (
    exists (
      select 1 from public.courrier_destinataires cd
      join public.courriers c on c.id = cd.courrier_id
      where cd.id = courrier_destinataire_actions.courrier_destinataire_id
        and (c.created_by = auth.uid() or app.has_permission('courrier', 'modifier', c.entite_id))
        and c.verrouille_le is null
    )
  )
  with check (
    exists (
      select 1 from public.courrier_destinataires cd
      join public.courriers c on c.id = cd.courrier_id
      where cd.id = courrier_destinataire_actions.courrier_destinataire_id
        and c.organisation_id = app.current_organisation_id()
        and c.verrouille_le is null
    )
  );

-- Tag admin (pas de logique en dur côté client) : une transition marquée
-- d'un type_action ouvre la modale riche au lieu du Popconfirm actuel,
-- uniquement pour les courriers entrants (cf. fn_imputer_courrier ci-dessous
-- pour la garde côté serveur).
alter table public.workflow_transitions
  add column type_action public.type_action_courrier;

-- Action distincte de 'affecter' : transmettre/rediriger à une personne de sa
-- hiérarchie est un droit différent d'imputer à une entité de son périmètre
-- (V5 §18 — droits basés sur rôle, pas hérités automatiquement).
insert into public.actions (code, libelle) values ('transmettre', 'Transmettre')
  on conflict (code) do nothing;

insert into public.permissions (role_id, module_id, action_id, portee)
select r.id, m.id, a.id, 'organisation'::public.portee_permission
from public.roles r
join public.modules m on m.code = 'courrier'
join public.actions a on a.code = 'transmettre'
where r.code = 'administrateur'
on conflict (role_id, module_id, action_id) do nothing;

-- app.fn_executer_transition: retourne désormais l'id de la ligne
-- workflow_historique créée (nécessaire pour corréler une action à l'étape
-- qu'elle a déclenchée — timeline enrichie V5 §14/§15). Changement de type de
-- retour -> DROP requis avant CREATE, comme pour tout changement de
-- signature dans ce projet.
drop function if exists app.fn_executer_transition(uuid, uuid, uuid, text, uuid, jsonb);

create function app.fn_executer_transition(
  p_instance_id uuid,
  p_transition_id uuid,
  p_utilisateur_id uuid,
  p_commentaire text default null,
  p_entite_objet uuid default null,
  p_contexte jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_instance record;
  v_transition record;
  v_nouveau_statut public.statut_instance_workflow;
  v_historique_id uuid;
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

  if not app.acteur_de_transition_autorise(p_transition_id, p_utilisateur_id, p_entite_objet) then
    raise exception 'Utilisateur % non autorisé pour la transition %', p_utilisateur_id, p_transition_id;
  end if;

  if not app.fn_condition_satisfaite(v_transition.condition, p_contexte) then
    raise exception 'Condition non satisfaite pour la transition %', p_transition_id;
  end if;

  insert into public.workflow_historique (workflow_instance_id, transition_id, etape_precedente_id, etape_suivante_id, utilisateur_id, commentaire)
  values (p_instance_id, p_transition_id, v_instance.etape_courante_id, v_transition.etape_cible_id, p_utilisateur_id, p_commentaire)
  returning id into v_historique_id;

  select case
    when we.type_etape in ('finale', 'rejet') then 'terminee'::public.statut_instance_workflow
    else 'en_cours'::public.statut_instance_workflow
  end
  into v_nouveau_statut
  from public.workflow_etapes we
  where we.id = v_transition.etape_cible_id;

  update public.workflow_instances
  set etape_courante_id = v_transition.etape_cible_id,
      etape_courante_depuis = now(),
      statut_instance = v_nouveau_statut,
      termine_le = case when v_nouveau_statut = 'terminee' then now() else termine_le end
  where id = p_instance_id;

  return v_historique_id;
end;
$$;

grant execute on function app.fn_executer_transition(uuid, uuid, uuid, text, uuid, jsonb) to authenticated;

-- fn_imputer_courrier: porte désormais les 4 types d'action (pas 4 fonctions
-- parallèles). Nouveaux paramètres tous optionnels (défaut null) -> les
-- appelants existants (CourrierImputationPanel, départ/interne) continuent de
-- fonctionner sans modification. Changement de liste de paramètres -> DROP
-- requis.
drop function if exists public.fn_imputer_courrier(uuid, uuid, uuid, text, date, uuid, text);

create function public.fn_imputer_courrier(
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
  v_historique_id uuid;
  v_entite_copie_id uuid;
  v_action_demandee_id uuid;
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

  -- Affectation/Imputation/Transmission/Redirection réservées aux courriers
  -- arrivés — garde côté serveur, pas seulement côté UI (même principe que
  -- la fermeture de la brèche décharge/sens en V5 précédente).
  if p_type_action is not null and v_courrier.sens <> 'entrant' then
    raise exception 'Action % réservée aux courriers entrants', p_type_action;
  end if;

  if not app.has_permission('courrier', 'affecter', p_entite_id) then
    raise exception 'Entité % hors du périmètre hiérarchique de l''appelant', p_entite_id;
  end if;

  v_entite_avant := v_courrier.entite_id;

  -- La transmission conserve la traçabilité du circuit initial (V5 §11) :
  -- contrairement aux 3 autres actions, elle ne réaffecte pas l'entité en
  -- charge du dossier — c'est la seule distinction technique entre les 4
  -- types d'action, tout le reste du mécanisme est strictement identique.
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

  if p_entites_copie_ids is not null then
    foreach v_entite_copie_id in array p_entites_copie_ids loop
      if not app.has_permission('courrier', 'affecter', v_entite_copie_id) then
        raise exception 'Entité en copie % hors du périmètre hiérarchique de l''appelant', v_entite_copie_id;
      end if;
      insert into public.courrier_destinataires (courrier_id, entite_id, type_diffusion)
      values (p_courrier_id, v_entite_copie_id, 'copie');
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
    where id = v_destinataire_principal_id;
  end if;

  return v_courrier;
end;
$$;

grant execute on function public.fn_imputer_courrier(
  uuid, uuid, uuid, text, date, uuid, text, public.type_action_courrier, uuid[], uuid[], uuid
) to authenticated;

-- fn_transitions_disponibles_courrier: + colonne type_action, pour que le
-- client sache quelle transition doit ouvrir la modale riche plutôt que le
-- Popconfirm actuel — décision pilotée par la configuration, jamais par une
-- correspondance de code/libellé côté client.
drop function if exists public.fn_transitions_disponibles_courrier(uuid);

create function public.fn_transitions_disponibles_courrier(p_courrier_id uuid)
returns table (
  transition_id uuid,
  code text,
  libelle_action text,
  etape_cible_id uuid,
  etape_cible_libelle text,
  type_action public.type_action_courrier
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_courrier record;
  v_instance record;
begin
  if not app.can_view_courrier(p_courrier_id) then
    raise exception 'Courrier % introuvable ou accès refusé', p_courrier_id;
  end if;

  select * into v_courrier from public.courriers where id = p_courrier_id;
  select * into v_instance from public.workflow_instances where id = v_courrier.workflow_instance_id;

  if v_instance.statut_instance <> 'en_cours' then
    return;
  end if;

  return query
  select wt.id, wt.code, wt.libelle_action, we.id, we.libelle, wt.type_action
  from public.workflow_transitions wt
  join public.workflow_etapes we on we.id = wt.etape_cible_id
  where wt.workflow_definition_id = v_instance.workflow_definition_id
    and (wt.etape_source_id = v_instance.etape_courante_id or wt.etape_source_id is null)
    and app.acteur_de_transition_autorise(wt.id, auth.uid(), v_courrier.entite_id)
    and app.fn_condition_satisfaite(wt.condition, to_jsonb(v_courrier));
end;
$$;

grant execute on function public.fn_transitions_disponibles_courrier(uuid) to authenticated;

-- fn_bannettes_courrier: la branche en_retard lisait uniquement le délai
-- statique de l'étape (workflow_etapes.delai_jours) — jamais l'échéance
-- saisie lors d'une imputation/affectation/transmission/redirection
-- (courrier_destinataires.echeance, pourtant déjà écrite depuis la V4). Même
-- signature -> CREATE OR REPLACE suffit.
create or replace function public.fn_bannettes_courrier(p_bannette text)
returns setof public.courriers
language plpgsql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
begin
  if p_bannette = 'a_traiter' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and wi.statut_instance = 'en_cours'
      and app.can_view_courrier(c.id)
      and exists (
        select 1
        from public.workflow_transitions wt
        where wt.workflow_definition_id = wi.workflow_definition_id
          and (wt.etape_source_id = wi.etape_courante_id or wt.etape_source_id is null)
          and app.acteur_de_transition_autorise(wt.id, auth.uid(), c.entite_id)
          and app.fn_condition_satisfaite(wt.condition, to_jsonb(c))
      );

  elsif p_bannette = 'en_retard' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and wi.statut_instance = 'en_cours'
      and (
        (we.delai_jours is not null and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now())
        or exists (
          select 1 from public.courrier_destinataires cd
          where cd.courrier_id = c.id
            and cd.type_diffusion = 'principal'
            and cd.echeance is not null
            and cd.echeance < current_date
        )
      )
      and app.can_view_courrier(c.id);

  elsif p_bannette = 'archives' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and we.type_etape = 'finale'
      and app.can_view_courrier(c.id);

  elsif p_bannette = 'sortants' then
    return query
    select c.*
    from public.courriers c
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and c.sens = 'sortant'
      and app.can_view_courrier(c.id);

  else
    raise exception 'Bannette % inconnue', p_bannette;
  end if;
end;
$$;

-- app.fn_detecter_et_notifier_retards: même correctif que ci-dessus, côté
-- notifications programmées. Boucle supplémentaire dédiée à l'échéance de
-- courrier_destinataires (spécifique au module courrier, contrairement à la
-- boucle existante qui couvre aussi documents/missions) — dupliquée plutôt
-- que fusionnée, cohérent avec la duplication déjà assumée entre cette
-- fonction et fn_bannettes_courrier (aucune des deux n'a jamais factorisé le
-- prédicat commun).
create or replace function app.fn_detecter_et_notifier_retards()
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_instance record;
  v_echeance_row record;
  v_objet_module text;
  v_objet_id uuid;
  v_entite_objet uuid;
  v_supprime_le timestamptz;
  v_jours_retard integer;
  v_acteur record;
  v_destinataire uuid;
  v_superieur uuid;
  v_deja_notifie boolean;
  v_nb_notifiees integer := 0;
begin
  for v_instance in
    select wi.id as instance_id, wi.etape_courante_id, we.libelle as etape_libelle, we.delai_jours,
           wi.etape_courante_depuis
    from public.workflow_instances wi
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where wi.statut_instance = 'en_cours'
      and we.delai_jours is not null
      and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now()
  loop
    v_objet_module := null;
    v_objet_id := null;
    v_entite_objet := null;
    v_supprime_le := null;

    select id, entite_id, supprime_le into v_objet_id, v_entite_objet, v_supprime_le
    from public.courriers where workflow_instance_id = v_instance.instance_id;
    if found then
      v_objet_module := 'courrier';
    else
      select id, entite_id, supprime_le into v_objet_id, v_entite_objet, v_supprime_le
      from public.documents where workflow_instance_id = v_instance.instance_id;
      if found then
        v_objet_module := 'ged';
      else
        select id, entite_id into v_objet_id, v_entite_objet
        from public.missions where workflow_instance_id = v_instance.instance_id;
        if found then
          v_objet_module := 'missions';
        end if;
      end if;
    end if;

    if v_objet_id is null or v_supprime_le is not null then
      continue;
    end if;

    select exists (
      select 1 from public.notifications
      where objet_module = v_objet_module
        and objet_id = v_objet_id
        and titre like 'Retard :%'
        and created_at::date = current_date
    ) into v_deja_notifie;
    if v_deja_notifie then
      continue;
    end if;

    v_jours_retard := floor(extract(epoch from (now() - v_instance.etape_courante_depuis)) / 86400)::integer;

    for v_acteur in
      select distinct wtr.*
      from public.workflow_transitions wt
      join public.workflow_transition_roles wtr on wtr.workflow_transition_id = wt.id
      where wt.etape_source_id = v_instance.etape_courante_id
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
           or (v_acteur.type_acteur = 'superieur_hierarchique_courant' and v_entite_objet is not null and exists (
                select 1 from public.entites e join public.entites parent on parent.id = e.parent_entite_id
                where e.id = v_entite_objet and parent.responsable_utilisateur_id = u.id
              ))
      loop
        insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
        values (
          v_destinataire,
          (select id from public.modules where code = v_objet_module),
          'Retard : ' || v_instance.etape_libelle,
          'En attente depuis ' || v_jours_retard || ' jour(s), délai dépassé.',
          v_objet_module,
          v_objet_id
        );
        v_nb_notifiees := v_nb_notifiees + 1;
      end loop;
    end loop;

    if v_entite_objet is not null then
      select parent.responsable_utilisateur_id into v_superieur
      from public.entites e
      join public.entites parent on parent.id = e.parent_entite_id
      where e.id = v_entite_objet;

      if v_superieur is not null then
        insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
        values (
          v_superieur,
          (select id from public.modules where code = v_objet_module),
          'Retard : ' || v_instance.etape_libelle,
          'Escalade — en attente depuis ' || v_jours_retard || ' jour(s) sans action, délai dépassé.',
          v_objet_module,
          v_objet_id
        );
        v_nb_notifiees := v_nb_notifiees + 1;
      end if;
    end if;
  end loop;

  -- Échéances de courrier_destinataires (imputation/affectation/transmission/
  -- redirection) dépassées, indépendamment du délai statique de l'étape.
  for v_echeance_row in
    select c.id as objet_id, c.entite_id as entite_objet, wi.etape_courante_id, we.libelle as etape_libelle,
           cd.echeance
    from public.courrier_destinataires cd
    join public.courriers c on c.id = cd.courrier_id
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where cd.type_diffusion = 'principal'
      and cd.echeance is not null
      and cd.echeance < current_date
      and wi.statut_instance = 'en_cours'
      and c.supprime_le is null
  loop
    select exists (
      select 1 from public.notifications
      where objet_module = 'courrier'
        and objet_id = v_echeance_row.objet_id
        and titre like 'Retard :%'
        and created_at::date = current_date
    ) into v_deja_notifie;
    if v_deja_notifie then
      continue;
    end if;

    v_jours_retard := (current_date - v_echeance_row.echeance);

    for v_acteur in
      select distinct wtr.*
      from public.workflow_transitions wt
      join public.workflow_transition_roles wtr on wtr.workflow_transition_id = wt.id
      where wt.etape_source_id = v_echeance_row.etape_courante_id
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
           or (v_acteur.type_acteur = 'responsable_entite_courante' and v_echeance_row.entite_objet is not null and exists (
                select 1 from public.entites e where e.id = v_echeance_row.entite_objet and e.responsable_utilisateur_id = u.id
              ))
           or (v_acteur.type_acteur = 'superieur_hierarchique_courant' and v_echeance_row.entite_objet is not null and exists (
                select 1 from public.entites e join public.entites parent on parent.id = e.parent_entite_id
                where e.id = v_echeance_row.entite_objet and parent.responsable_utilisateur_id = u.id
              ))
      loop
        insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
        values (
          v_destinataire,
          (select id from public.modules where code = 'courrier'),
          'Retard : ' || v_echeance_row.etape_libelle,
          'Échéance dépassée depuis ' || v_jours_retard || ' jour(s).',
          'courrier',
          v_echeance_row.objet_id
        );
        v_nb_notifiees := v_nb_notifiees + 1;
      end loop;
    end loop;
  end loop;

  return v_nb_notifiees;
end;
$$;

-- Entités et personnes vers lesquelles l'utilisateur courant peut
-- transmettre/rediriger (V5 §10) — réutilise strictement les deux niveaux
-- hiérarchiques déjà modélisés (responsable_entite_courante,
-- superieur_hierarchique_courant dans app.fn_candidat_satisfait_acteur), pas
-- de nouvelle chaîne de reporting.
create or replace function app.fn_entites_transmissibles()
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
    and app.has_permission('courrier', 'transmettre', e.id);
end;
$$;

create or replace function public.fn_entites_transmissibles()
returns setof public.entites
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from app.fn_entites_transmissibles();
$$;

grant execute on function public.fn_entites_transmissibles() to authenticated;

create or replace function app.fn_personnes_transmissibles()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  return query
  select distinct e.responsable_utilisateur_id
  from public.entites e
  where e.organisation_id = app.current_organisation_id()
    and e.actif
    and e.responsable_utilisateur_id is not null
    and app.has_permission('courrier', 'transmettre', e.id)
  union
  select parent.responsable_utilisateur_id
  from public.utilisateurs u
  join public.entites e on e.id = u.entite_id
  join public.entites parent on parent.id = e.parent_entite_id
  where u.id = auth.uid()
    and parent.responsable_utilisateur_id is not null;
end;
$$;

create or replace function public.fn_personnes_transmissibles()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from app.fn_personnes_transmissibles();
$$;

grant execute on function public.fn_personnes_transmissibles() to authenticated;
