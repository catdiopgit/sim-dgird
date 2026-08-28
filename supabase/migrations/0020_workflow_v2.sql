-- Moteur de workflow V2 (voir prompts/Configuration workflow.txt) : ciblage
-- d'acteur polymorphe par transition, délégations temporaires, conditions de
-- transition enfin exploitées, notifications automatiques, gestion des délais.
-- Le cœur du moteur (workflow_definitions/etapes/transitions/instances/
-- historique) n'est pas modifié structurellement — on étend l'existant plutôt
-- que de dupliquer, conformément à la règle "évite les duplications".

-- 1. Acteurs de transition polymorphes -------------------------------------
-- workflow_transition_roles ne ciblait que des rôles. On l'étend plutôt que
-- de créer une table parallèle: les lignes existantes deviennent
-- type_acteur='role' automatiquement (valeur par défaut), aucune donnée perdue.

create type public.type_acteur_workflow as enum (
  'role',
  'fonction',
  'entite',
  'entite_et_descendants',
  'utilisateur',
  'responsable_entite_courante',
  'superieur_hierarchique_courant'
);

alter table public.workflow_transition_roles
  alter column role_id drop not null,
  add column type_acteur public.type_acteur_workflow not null default 'role',
  add column fonction_id uuid references public.fonctions(id) on delete cascade,
  add column entite_id uuid references public.entites(id) on delete cascade,
  add column utilisateur_id uuid references public.utilisateurs(id) on delete cascade;

alter table public.workflow_transition_roles
  add constraint workflow_transition_roles_type_ck check (
    (type_acteur = 'role' and role_id is not null and fonction_id is null and entite_id is null and utilisateur_id is null)
    or (type_acteur = 'fonction' and fonction_id is not null and role_id is null and entite_id is null and utilisateur_id is null)
    or (type_acteur in ('entite', 'entite_et_descendants') and entite_id is not null and role_id is null and fonction_id is null and utilisateur_id is null)
    or (type_acteur = 'utilisateur' and utilisateur_id is not null and role_id is null and fonction_id is null and entite_id is null)
    or (type_acteur in ('responsable_entite_courante', 'superieur_hierarchique_courant') and role_id is null and fonction_id is null and entite_id is null and utilisateur_id is null)
  );

-- 2. Délégations --------------------------------------------------------------
-- Concept réellement absent du modèle V1, transverse (pas propre au courrier).

create table public.delegations (
  id uuid primary key default extensions.gen_random_uuid(),
  delegant_id uuid not null references public.utilisateurs(id) on delete cascade,
  delegataire_id uuid not null references public.utilisateurs(id) on delete cascade,
  -- module_id/entite_id null = délégation à portée totale du délégant.
  module_id uuid references public.modules(id) on delete cascade,
  entite_id uuid references public.entites(id) on delete cascade,
  date_debut date not null default current_date,
  date_fin date,
  motif text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  check (delegant_id <> delegataire_id)
);

create index idx_delegations_delegataire on public.delegations(delegataire_id);
create index idx_delegations_delegant on public.delegations(delegant_id);

alter table public.delegations enable row level security;

create policy delegations_select on public.delegations
  for select using (
    delegant_id = auth.uid()
    or delegataire_id = auth.uid()
    or exists (
      select 1 from public.utilisateurs u
      where u.id = delegations.delegant_id
        and u.organisation_id = app.current_organisation_id()
        and app.has_permission('administration', 'consulter')
    )
  );

create policy delegations_write on public.delegations
  for all using (
    delegant_id = auth.uid()
    or exists (
      select 1 from public.utilisateurs u
      where u.id = delegations.delegant_id
        and u.organisation_id = app.current_organisation_id()
        and app.has_permission('administration', 'modifier')
    )
  )
  with check (
    exists (
      select 1 from public.utilisateurs u1
      join public.utilisateurs u2 on u2.organisation_id = u1.organisation_id
      where u1.id = delegations.delegant_id
        and u2.id = delegations.delegataire_id
        and u1.organisation_id = app.current_organisation_id()
    )
  );

-- Traçabilité (§9 du prompt: "traçable, révocable") via le mécanisme d'audit
-- générique déjà en place plutôt qu'un journal dédié.
create trigger trg_audit_delegations
  after insert or update or delete on public.delegations
  for each row execute function app.fn_audit_trigger();

-- 3. app.has_permission avec prise en compte des délégations ------------------
-- Extraction de la logique originale (0004) dans une fonction "directe" pour
-- pouvoir la réévaluer sur le délégant sans dupliquer le corps de la requête.

create or replace function app.fn_a_permission_directe(
  p_utilisateur_id uuid,
  p_module text,
  p_action text,
  p_entite_id uuid default null
)
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
  where ur.utilisateur_id = p_utilisateur_id
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

create or replace function app.has_permission(p_module text, p_action text, p_entite_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_delegation record;
begin
  if app.fn_a_permission_directe(auth.uid(), p_module, p_action, p_entite_id) then
    return true;
  end if;

  -- Délégation (§9): le délégataire hérite temporairement des permissions du
  -- délégant, dans la portée (module/entité) de la délégation active.
  for v_delegation in
    select d.delegant_id
    from public.delegations d
    where d.delegataire_id = auth.uid()
      and d.actif
      and d.date_debut <= current_date
      and (d.date_fin is null or d.date_fin >= current_date)
      and (d.module_id is null or d.module_id = (select id from public.modules where code = p_module))
      and (d.entite_id is null or d.entite_id = p_entite_id)
  loop
    if app.fn_a_permission_directe(v_delegation.delegant_id, p_module, p_action, p_entite_id) then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

-- 4. Résolution d'acteur de transition (rôle/fonction/entité/utilisateur/
--    responsable/supérieur hiérarchique), avec prise en compte des délégations.

create or replace function app.fn_candidat_satisfait_acteur(
  p_type_acteur public.type_acteur_workflow,
  p_role_id uuid,
  p_fonction_id uuid,
  p_entite_id uuid,
  p_utilisateur_cible uuid,
  p_candidat uuid,
  p_entite_objet uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  case p_type_acteur
    when 'role' then
      return exists (
        select 1 from public.utilisateur_roles ur
        where ur.utilisateur_id = p_candidat and ur.role_id = p_role_id
          and (ur.date_fin is null or ur.date_fin >= current_date)
      );
    when 'fonction' then
      return exists (select 1 from public.utilisateurs u where u.id = p_candidat and u.fonction_id = p_fonction_id);
    when 'entite' then
      return exists (select 1 from public.utilisateurs u where u.id = p_candidat and u.entite_id = p_entite_id);
    when 'entite_et_descendants' then
      return exists (
        select 1 from public.utilisateurs u
        join public.entites cible on cible.id = u.entite_id
        join public.entites racine on racine.id = p_entite_id
        where u.id = p_candidat and racine.chemin @> cible.chemin
      );
    when 'utilisateur' then
      return p_candidat = p_utilisateur_cible;
    when 'responsable_entite_courante' then
      return p_entite_objet is not null and exists (
        select 1 from public.entites e where e.id = p_entite_objet and e.responsable_utilisateur_id = p_candidat
      );
    when 'superieur_hierarchique_courant' then
      return p_entite_objet is not null and exists (
        select 1 from public.entites e
        join public.entites parent on parent.id = e.parent_entite_id
        where e.id = p_entite_objet and parent.responsable_utilisateur_id = p_candidat
      );
    else
      return false;
  end case;
end;
$$;

create or replace function app.acteur_de_transition_autorise(
  p_transition_id uuid,
  p_utilisateur_id uuid,
  p_entite_objet uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_acteur record;
  v_candidat uuid;
begin
  if not exists (select 1 from public.workflow_transition_roles where workflow_transition_id = p_transition_id) then
    -- Comportement historique (0006): aucun acteur déclaré = ouvert à quiconque
    -- a accès à l'objet (le contrôle d'accès à l'objet reste fait en amont).
    return true;
  end if;

  for v_acteur in
    select * from public.workflow_transition_roles where workflow_transition_id = p_transition_id
  loop
    if app.fn_candidat_satisfait_acteur(
      v_acteur.type_acteur, v_acteur.role_id, v_acteur.fonction_id, v_acteur.entite_id,
      v_acteur.utilisateur_id, p_utilisateur_id, p_entite_objet
    ) then
      return true;
    end if;

    -- Délégation (§9, ex. "DG absent -> Secrétaire autorisée à traiter ses
    -- courriers"): le demandeur agit s'il est délégataire actif de quelqu'un
    -- qui satisferait lui-même cet acteur.
    for v_candidat in
      select d.delegant_id
      from public.delegations d
      where d.delegataire_id = p_utilisateur_id
        and d.actif
        and d.date_debut <= current_date
        and (d.date_fin is null or d.date_fin >= current_date)
    loop
      if app.fn_candidat_satisfait_acteur(
        v_acteur.type_acteur, v_acteur.role_id, v_acteur.fonction_id, v_acteur.entite_id,
        v_acteur.utilisateur_id, v_candidat, p_entite_objet
      ) then
        return true;
      end if;
    end loop;
  end loop;

  return false;
end;
$$;

-- 5. Conditions de transition (jsonb déjà présent depuis 0005, jamais évalué) -
-- Format volontairement simple plutôt qu'un moteur d'expression générique:
-- {"champ": "priorite_valeur_id", "operateur": "=", "valeur": "<uuid>"}.
-- Le contexte est un to_jsonb() de l'objet porteur (ex. la ligne courriers).

create or replace function app.fn_condition_satisfaite(p_condition jsonb, p_contexte jsonb)
returns boolean
language plpgsql
stable
as $$
declare
  v_champ text;
  v_operateur text;
  v_valeur jsonb;
  v_valeur_contexte jsonb;
begin
  if p_condition is null or p_condition = '{}'::jsonb then
    return true;
  end if;

  v_champ := p_condition ->> 'champ';
  if v_champ is null then
    return true;
  end if;

  v_operateur := coalesce(p_condition ->> 'operateur', '=');
  v_valeur := p_condition -> 'valeur';
  v_valeur_contexte := p_contexte -> v_champ;

  case v_operateur
    when '=' then
      return v_valeur_contexte = v_valeur;
    when '<>' then
      return v_valeur_contexte is distinct from v_valeur;
    when 'in' then
      return v_valeur_contexte in (select jsonb_array_elements(v_valeur));
    when '>' then
      return (v_valeur_contexte #>> '{}')::numeric > (v_valeur #>> '{}')::numeric;
    when '<' then
      return (v_valeur_contexte #>> '{}')::numeric < (v_valeur #>> '{}')::numeric;
    when '>=' then
      return (v_valeur_contexte #>> '{}')::numeric >= (v_valeur #>> '{}')::numeric;
    when '<=' then
      return (v_valeur_contexte #>> '{}')::numeric <= (v_valeur #>> '{}')::numeric;
    else
      return true;
  end case;
exception when others then
  -- Une condition malformée (ex. champ non numérique avec un opérateur
  -- numérique) ne doit jamais faire planter le workflow: traitée comme non
  -- satisfaite plutôt que de lever une exception jusqu'à l'appelant.
  return false;
end;
$$;

-- 6. Horodatage d'entrée dans l'étape courante (pour calculer les retards) ---

alter table public.workflow_instances
  add column etape_courante_depuis timestamptz not null default now();

-- 7. app.fn_demarrer_workflow: renseigne etape_courante_depuis --------------

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

  insert into public.workflow_instances (workflow_definition_id, etape_courante_id, etape_courante_depuis, created_by)
  values (v_definition_id, v_etape_initiale_id, now(), p_utilisateur_id)
  returning id into v_instance_id;

  insert into public.workflow_historique (workflow_instance_id, etape_precedente_id, etape_suivante_id, utilisateur_id, commentaire)
  values (v_instance_id, null, v_etape_initiale_id, p_utilisateur_id, 'Démarrage du workflow');

  return v_instance_id;
end;
$$;

-- 8. app.fn_executer_transition: acteur polymorphe + condition + horodatage -
-- Signature étendue (2 nouveaux paramètres) -> DROP requis avant CREATE OR
-- REPLACE, sinon Postgres créerait un second overload et l'ancien 4-arguments
-- (avec l'ancienne logique de contrôle par rôle) resterait actif.

drop function if exists app.fn_executer_transition(uuid, uuid, uuid, text);

create or replace function app.fn_executer_transition(
  p_instance_id uuid,
  p_transition_id uuid,
  p_utilisateur_id uuid,
  p_commentaire text default null,
  p_entite_objet uuid default null,
  p_contexte jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_instance record;
  v_transition record;
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

  if not app.acteur_de_transition_autorise(p_transition_id, p_utilisateur_id, p_entite_objet) then
    raise exception 'Utilisateur % non autorisé pour la transition %', p_utilisateur_id, p_transition_id;
  end if;

  if not app.fn_condition_satisfaite(v_transition.condition, p_contexte) then
    raise exception 'Condition non satisfaite pour la transition %', p_transition_id;
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
      etape_courante_depuis = now(),
      statut_instance = v_nouveau_statut,
      termine_le = case when v_nouveau_statut = 'terminee' then now() else termine_le end
  where id = p_instance_id;
end;
$$;

grant execute on function app.fn_executer_transition(uuid, uuid, uuid, text, uuid, jsonb) to authenticated;

-- 9. Wrappers publics courrier (0019): propagent entité + contexte ----------

create or replace function public.fn_executer_transition_courrier(
  p_courrier_id uuid,
  p_transition_id uuid,
  p_commentaire text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_courrier record;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  -- Même règle que la policy RLS courriers_update (0015): créateur ou
  -- permission 'modifier'. Le ciblage fin par acteur (rôle/fonction/entité/
  -- responsable...) reste appliqué séparément par app.fn_executer_transition.
  if not (
    v_courrier.created_by = auth.uid()
    or app.has_permission('courrier', 'modifier', v_courrier.entite_id)
  ) then
    raise exception 'Permission refusée sur le courrier %', p_courrier_id;
  end if;

  if v_courrier.workflow_instance_id is null then
    raise exception 'Courrier % sans instance de workflow', p_courrier_id;
  end if;

  perform app.fn_executer_transition(
    v_courrier.workflow_instance_id,
    p_transition_id,
    auth.uid(),
    p_commentaire,
    v_courrier.entite_id,
    to_jsonb(v_courrier)
  );
end;
$$;

-- Nouveau: liste les transitions réellement actionnables par l'appelant sur ce
-- courrier (acteur + condition déjà évalués côté serveur), pour que le front
-- n'ait plus à reproduire la résolution polymorphe en TypeScript.
create or replace function public.fn_transitions_disponibles_courrier(p_courrier_id uuid)
returns table (
  transition_id uuid,
  code text,
  libelle_action text,
  etape_cible_id uuid,
  etape_cible_libelle text
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
  select wt.id, wt.code, wt.libelle_action, we.id, we.libelle
  from public.workflow_transitions wt
  join public.workflow_etapes we on we.id = wt.etape_cible_id
  where wt.workflow_definition_id = v_instance.workflow_definition_id
    and (wt.etape_source_id = v_instance.etape_courante_id or wt.etape_source_id is null)
    and app.acteur_de_transition_autorise(wt.id, auth.uid(), v_courrier.entite_id)
    and app.fn_condition_satisfaite(wt.condition, to_jsonb(v_courrier));
end;
$$;

grant execute on function public.fn_transitions_disponibles_courrier(uuid) to authenticated;

-- 10. Notifications automatiques sur changement d'étape ----------------------
-- La table notifications (0012) existait mais n'était alimentée par rien.

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
begin
  -- Le démarrage (transition_id null) ne notifie personne d'autre que le
  -- créateur, déjà informé puisqu'il vient d'agir.
  if new.transition_id is null then
    return new;
  end if;

  select id, entite_id into v_objet_id, v_entite_objet
  from public.courriers where workflow_instance_id = new.workflow_instance_id;
  if found then
    v_objet_module := 'courrier';
  else
    select id, entite_id into v_objet_id, v_entite_objet
    from public.documents where workflow_instance_id = new.workflow_instance_id;
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

  -- Notifie les acteurs des transitions qui partent de l'étape désormais
  -- atteinte (ceux qui peuvent agir ensuite) - pas celles "ouvertes à tous"
  -- (aucune ligne d'acteur), pour éviter de notifier toute l'organisation.
  for v_acteur in
    select distinct wtr.*
    from public.workflow_transitions wt
    join public.workflow_transition_roles wtr on wtr.workflow_transition_id = wt.id
    where wt.etape_source_id = new.etape_suivante_id
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
        'Action requise : ' || coalesce(v_etape_libelle, ''),
        new.commentaire,
        v_objet_module,
        v_objet_id
      );
    end loop;
  end loop;

  return new;
end;
$$;

create trigger trg_workflow_historique_notifier
  after insert on public.workflow_historique
  for each row execute function app.fn_notifier_transition();

-- 11. Imputation enrichie (instruction + échéance) sur la diffusion ---------
-- Réutilise courrier_destinataires plutôt qu'une table "imputations" séparée.

alter table public.courrier_destinataires
  add column instruction text,
  add column echeance date;

-- 12. Positions pour l'éditeur graphique de workflow (Étape 3 du plan) ------

alter table public.workflow_etapes
  add column position_x integer,
  add column position_y integer;
