-- Missions V1 : branche le frontend sur le schéma/RLS/workflow déjà posés
-- en 0011/0016/seed §12. Complète ce qui manquait pour rendre le module
-- réellement utilisable :
--   1. documents.mission_id (visibilité RLS des documents de mission sans
--      permission GED, même patron que documents.projet_id).
--   2. app.can_modifier_mission (centralise responsable/permission, même
--      patron que app.can_modifier_projet).
--   3. budget_reel recalculé automatiquement depuis mission_depenses.
--   4. RPC fn_creer_mission (numérotation + démarrage du workflow + insert,
--      même patron que fn_soumettre_versement/fn_creer_courrier_contact).
--   5. RPC fn_ajouter_document_mission (ordre de mission / compte-rendu /
--      PV / justificatif de dépense).
--   6. RPC fn_transitions_disponibles_mission / fn_executer_transition_mission
--      (même patron que le pendant GED, fn_*_versement, 0058).
--   7. Fusion des étapes "retour" + "rapport-pv" en une seule étape
--      "retour-rapport" dans le circuit "mission-standard" (déjà semé pour
--      l'organisation de démo) — demandée par l'utilisateur après revue du
--      circuit à 9 étapes.
--   8. Provisionnement (référentiel, numérotation, workflow, permissions)
--      pour toute organisation qui n'a pas encore ces données — pas
--      seulement l'organisation de démo comme le seed d'origine.

-- 1. documents.mission_id ----------------------------------------------

alter table public.documents
  add column mission_id uuid references public.missions(id) on delete cascade;

create index idx_documents_mission on public.documents(mission_id);

create or replace function app.can_view_document(p_document_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc record;
  v_result boolean;
begin
  select * into v_doc from public.documents where id = p_document_id;
  if not found then
    return false;
  end if;

  if v_doc.organisation_id <> app.current_organisation_id() then
    return false;
  end if;

  if v_doc.created_by = auth.uid() or app.has_permission('ged', 'consulter', v_doc.entite_id) then
    return true;
  end if;

  if v_doc.projet_id is not null and app.can_view_projet(v_doc.projet_id) then
    return true;
  end if;

  if v_doc.mission_id is not null and app.can_view_mission(v_doc.mission_id) then
    return true;
  end if;

  select true into v_result
  from public.document_droits dd
  left join public.utilisateur_roles ur on ur.role_id = dd.role_id and ur.utilisateur_id = auth.uid()
  where dd.document_id = p_document_id
    and dd.action_id = (select id from public.actions where code = 'consulter')
    and (dd.utilisateur_id = auth.uid() or dd.entite_id = app.current_entite_id() or ur.utilisateur_id is not null)
  limit 1;

  if coalesce(v_result, false) then
    return true;
  end if;

  if v_doc.dossier_id is not null then
    select true into v_result
    from public.dossier_droits dr
    left join public.utilisateur_roles ur on ur.role_id = dr.role_id and ur.utilisateur_id = auth.uid()
    where dr.dossier_id = v_doc.dossier_id
      and dr.action_id = (select id from public.actions where code = 'consulter')
      and (dr.utilisateur_id = auth.uid() or dr.entite_id = app.current_entite_id() or ur.utilisateur_id is not null)
    limit 1;
  end if;

  return coalesce(v_result, false);
end;
$$;

-- 2. app.can_modifier_mission ---------------------------------------------

create or replace function app.can_modifier_mission(p_mission_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_mission record;
begin
  select * into v_mission from public.missions where id = p_mission_id;
  if not found then
    return false;
  end if;

  if v_mission.organisation_id <> app.current_organisation_id() then
    return false;
  end if;

  return v_mission.responsable_id = auth.uid() or app.has_permission('missions', 'modifier', v_mission.entite_id);
end;
$$;

-- 3. budget_reel recalculé depuis mission_depenses -------------------------

create or replace function app.fn_recalculer_budget_reel_mission(p_mission_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.missions
  set budget_reel = coalesce((select sum(md.montant) from public.mission_depenses md where md.mission_id = p_mission_id), 0)
  where id = p_mission_id;
end;
$$;

create or replace function app.trg_mission_depenses_recalcule_budget()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform app.fn_recalculer_budget_reel_mission(old.mission_id);
    return old;
  end if;

  perform app.fn_recalculer_budget_reel_mission(new.mission_id);
  if tg_op = 'UPDATE' and old.mission_id <> new.mission_id then
    perform app.fn_recalculer_budget_reel_mission(old.mission_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mission_depenses_recalcule_budget on public.mission_depenses;
create trigger trg_mission_depenses_recalcule_budget
  after insert or update of montant, mission_id or delete on public.mission_depenses
  for each row execute function app.trg_mission_depenses_recalcule_budget();

-- 4. fn_creer_mission -------------------------------------------------------
-- app.fn_generer_numero / app.fn_demarrer_workflow ne sont accordées qu'à
-- `authenticated` pour être appelées depuis un wrapper public SECURITY
-- DEFINER (jamais directement depuis le client, cf. fn_creer_courrier_contact,
-- fn_soumettre_versement 0058) : la policy missions_insert exigerait
-- app.has_permission('missions','creer', entite_id), qu'un wrapper SECURITY
-- DEFINER contourne — donc revérifiée explicitement ici.

create or replace function public.fn_creer_mission(
  p_entite_id uuid,
  p_objet text,
  p_date_depart date,
  p_date_retour date,
  p_responsable_id uuid default null,
  p_lieu text default null,
  p_objectifs text default null,
  p_activites_prevues text default null,
  p_budget_prevu numeric default null
)
returns public.missions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organisation_id uuid := app.current_organisation_id();
  v_reference text;
  v_workflow_instance_id uuid;
  v_etape_code text;
  v_etape_libelle text;
  v_mission public.missions;
begin
  if not app.has_permission('missions', 'creer', p_entite_id) then
    raise exception 'Permission refusée (missions/creer)';
  end if;

  v_reference := app.fn_generer_numero(v_organisation_id, 'missions');
  v_workflow_instance_id := app.fn_demarrer_workflow('missions', v_organisation_id, auth.uid());

  select we.code, we.libelle
  into v_etape_code, v_etape_libelle
  from public.workflow_instances wi
  join public.workflow_etapes we on we.id = wi.etape_courante_id
  where wi.id = v_workflow_instance_id;

  insert into public.missions (
    organisation_id, entite_id, reference, objet, responsable_id, lieu,
    date_depart, date_retour, objectifs, activites_prevues, budget_prevu,
    workflow_instance_id, etape_code, etape_libelle, created_by
  ) values (
    v_organisation_id, p_entite_id, v_reference, p_objet, p_responsable_id, p_lieu,
    p_date_depart, p_date_retour, p_objectifs, p_activites_prevues, p_budget_prevu,
    v_workflow_instance_id, v_etape_code, v_etape_libelle, auth.uid()
  )
  returning * into v_mission;

  return v_mission;
end;
$$;

grant execute on function public.fn_creer_mission(uuid, text, date, date, uuid, text, text, text, numeric) to authenticated;

-- 5. fn_ajouter_document_mission --------------------------------------------
-- p_role détermine quelle colonne FK est mise à jour après création du
-- document ; 'depense' exige p_depense_id (justificatif) plutôt qu'un slot
-- fixe sur missions. Même séquence à deux étapes que fn_ajouter_document_projet
-- (0073) : le document est créé ici, le fichier est versé séparément côté
-- client (services/ged/documents.ts:verserVersion), avec rollback si l'upload
-- échoue.

create or replace function public.fn_ajouter_document_mission(
  p_mission_id uuid,
  p_titre text,
  p_role text,
  p_description text default null,
  p_depense_id uuid default null
)
returns public.documents
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_mission public.missions;
  v_document public.documents;
begin
  if p_role not in ('ordre_mission', 'compte_rendu', 'pv', 'depense') then
    raise exception 'Rôle de document invalide: %', p_role;
  end if;

  select * into v_mission from public.missions where id = p_mission_id;
  if not found then
    raise exception 'Mission % introuvable', p_mission_id;
  end if;

  if not app.can_modifier_mission(p_mission_id) then
    raise exception 'Permission refusée sur la mission %', p_mission_id;
  end if;

  if p_role = 'depense' then
    if p_depense_id is null or not exists (
      select 1 from public.mission_depenses where id = p_depense_id and mission_id = p_mission_id
    ) then
      raise exception 'Dépense % n''appartient pas à la mission %', p_depense_id, p_mission_id;
    end if;
  end if;

  insert into public.documents (organisation_id, mission_id, entite_id, titre, description, created_by)
  values (v_mission.organisation_id, p_mission_id, v_mission.entite_id, p_titre, p_description, auth.uid())
  returning * into v_document;

  if p_role = 'ordre_mission' then
    update public.missions set ordre_mission_document_id = v_document.id where id = p_mission_id;
  elsif p_role = 'compte_rendu' then
    update public.missions set compte_rendu_document_id = v_document.id where id = p_mission_id;
  elsif p_role = 'pv' then
    update public.missions set pv_document_id = v_document.id where id = p_mission_id;
  elsif p_role = 'depense' then
    update public.mission_depenses set justificatif_document_id = v_document.id where id = p_depense_id;
  end if;

  return v_document;
end;
$$;

grant execute on function public.fn_ajouter_document_mission(uuid, text, text, text, uuid) to authenticated;

-- 6. Workflow mission : transitions disponibles / exécution ----------------
-- Copie conforme de fn_transitions_disponibles_versement /
-- fn_executer_transition_versement (0058), adaptée à missions.

create or replace function public.fn_transitions_disponibles_mission(p_mission_id uuid)
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
  v_mission record;
  v_instance record;
begin
  select * into v_mission from public.missions where id = p_mission_id;
  if not found or v_mission.organisation_id <> app.current_organisation_id() then
    raise exception 'Mission % introuvable ou accès refusé', p_mission_id;
  end if;

  if not app.can_view_mission(p_mission_id) then
    raise exception 'Mission % introuvable ou accès refusé', p_mission_id;
  end if;

  if v_mission.workflow_instance_id is null then
    return;
  end if;

  select * into v_instance from public.workflow_instances where id = v_mission.workflow_instance_id;

  if v_instance.statut_instance <> 'en_cours' then
    return;
  end if;

  return query
  select wt.id, wt.code, wt.libelle_action, we.id, we.libelle
  from public.workflow_transitions wt
  join public.workflow_etapes we on we.id = wt.etape_cible_id
  where wt.workflow_definition_id = v_instance.workflow_definition_id
    and (wt.etape_source_id = v_instance.etape_courante_id or wt.etape_source_id is null)
    and app.acteur_de_transition_autorise(wt.id, auth.uid(), v_mission.entite_id)
    and app.fn_condition_satisfaite(wt.condition, to_jsonb(v_mission));
end;
$$;

grant execute on function public.fn_transitions_disponibles_mission(uuid) to authenticated;

create or replace function public.fn_executer_transition_mission(
  p_mission_id uuid,
  p_transition_id uuid,
  p_commentaire text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mission record;
begin
  select * into v_mission from public.missions where id = p_mission_id;
  if not found then
    raise exception 'Mission % introuvable', p_mission_id;
  end if;

  if v_mission.organisation_id <> app.current_organisation_id() then
    raise exception 'Mission % hors de l''organisation courante', p_mission_id;
  end if;

  if v_mission.workflow_instance_id is null then
    raise exception 'Mission % sans instance de workflow', p_mission_id;
  end if;

  perform app.fn_executer_transition(
    v_mission.workflow_instance_id,
    p_transition_id,
    auth.uid(),
    p_commentaire,
    v_mission.entite_id,
    to_jsonb(v_mission)
  );
end;
$$;

grant execute on function public.fn_executer_transition_mission(uuid, uuid, text) to authenticated;

-- 7. Fusion des étapes "retour" + "rapport-pv" ------------------------------
-- Renomme l'étape "retour" en place (conserve son id, donc toute instance ou
-- ligne d'historique déjà positionnée dessus reste valide) pour qu'elle
-- devienne l'étape fusionnée, redirige la transition sortante de "rapport-pv"
-- vers ce nouvel id, supprime la transition "retour -> rapport-pv" devenue
-- inutile, puis supprime l'étape "rapport-pv" désormais orpheline.

do $$
declare
  v_wd record;
  v_etape_retour_id uuid;
  v_etape_rapport_id uuid;
begin
  for v_wd in select * from public.workflow_definitions where code = 'mission-standard' loop
    select id into v_etape_retour_id from public.workflow_etapes where workflow_definition_id = v_wd.id and code = 'retour';
    select id into v_etape_rapport_id from public.workflow_etapes where workflow_definition_id = v_wd.id and code = 'rapport-pv';

    if v_etape_retour_id is null or v_etape_rapport_id is null then
      continue;
    end if;

    update public.workflow_etapes
    set code = 'retour-rapport', libelle = 'Retour et rapport/PV'
    where id = v_etape_retour_id;

    update public.workflow_transitions
    set etape_source_id = v_etape_retour_id
    where workflow_definition_id = v_wd.id and etape_source_id = v_etape_rapport_id;

    delete from public.workflow_transitions
    where workflow_definition_id = v_wd.id and code = 'rediger-rapport';

    update public.workflow_transitions
    set libelle_action = 'Enregistrer le retour et rédiger le rapport/PV'
    where workflow_definition_id = v_wd.id and code = 'retourner';

    delete from public.workflow_etapes where id = v_etape_rapport_id;
  end loop;
end $$;

-- 8. Provisionnement pour toute organisation sans données missions ---------
-- Même contenu que supabase/seed/01_seed.sql §12, mais sans filtre sur
-- 'sim-demo' : s'applique à l'organisation réelle de la DGDDI dès que cette
-- migration est poussée. Circuit déjà fusionné (8 étapes). Les lignes
-- permissions/rôles-transition ne s'insèrent que si des rôles portant ces
-- codes existent déjà pour l'organisation (sinon no-op silencieux — à
-- accorder ensuite via Administration > Rôles si besoin).

insert into public.listes_valeurs (organisation_id, code, libelle, module_id)
select o.id, 'mission_type_participant', 'Type de participant à une mission', m.id
from public.organisations o
join public.modules m on m.code = 'missions'
on conflict (organisation_id, code) do nothing;

insert into public.valeurs_listes (liste_id, code, libelle, couleur, ordre, valeur_defaut)
select lv.id, v.code, v.libelle, v.couleur, v.ordre, v.valeur_defaut
from public.listes_valeurs lv
join (values
  ('chef-mission', 'Chef de mission', 'purple', 1, false),
  ('participant', 'Participant', 'blue', 2, true)
) as v(code, libelle, couleur, ordre, valeur_defaut) on true
where lv.code = 'mission_type_participant'
on conflict (liste_id, code) do nothing;

insert into public.regles_numerotation (organisation_id, module_id, format, reinitialisation)
select o.id, m.id, 'MIS-{ANNEE}-{SEQ:4}', 'annuelle'::public.reinitialisation_numerotation
from public.organisations o
join public.modules m on m.code = 'missions'
on conflict (organisation_id, module_id, (coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid)), (coalesce(valeur_liste_id, '00000000-0000-0000-0000-000000000000'::uuid)))
do nothing;

insert into public.workflow_definitions (organisation_id, module_id, code, libelle, est_defaut)
select o.id, m.id, 'mission-standard', 'Circuit mission standard', true
from public.organisations o
join public.modules m on m.code = 'missions'
on conflict (organisation_id, module_id, code) do nothing;

insert into public.workflow_etapes (workflow_definition_id, code, libelle, ordre, type_etape)
select wd.id, v.code, v.libelle, v.ordre, v.type_etape::public.type_etape_workflow
from public.workflow_definitions wd
join (values
  ('creation', 'Création', 1, 'initiale'),
  ('soumission', 'Soumission', 2, 'intermediaire'),
  ('validation-soumission', 'Validation', 3, 'intermediaire'),
  ('preparation', 'Préparation', 4, 'intermediaire'),
  ('en-cours', 'Mission en cours', 5, 'intermediaire'),
  ('retour-rapport', 'Retour et rapport/PV', 6, 'intermediaire'),
  ('validation-rapport', 'Validation du rapport', 7, 'intermediaire'),
  ('cloture', 'Clôture', 8, 'finale')
) as v(code, libelle, ordre, type_etape) on true
where wd.code = 'mission-standard'
on conflict (workflow_definition_id, code) do nothing;

insert into public.workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
select wd.id, src.id, tgt.id, v.code, v.libelle_action
from public.workflow_definitions wd
join (values
  ('creation', 'soumission', 'soumettre', 'Soumettre'),
  ('soumission', 'validation-soumission', 'valider-soumission', 'Valider la soumission'),
  ('validation-soumission', 'preparation', 'preparer', 'Préparer'),
  ('preparation', 'en-cours', 'demarrer', 'Démarrer la mission'),
  ('en-cours', 'retour-rapport', 'retourner', 'Enregistrer le retour et rédiger le rapport/PV'),
  ('retour-rapport', 'validation-rapport', 'valider-rapport', 'Valider le rapport'),
  ('validation-rapport', 'cloture', 'cloturer', 'Clôturer')
) as v(source_code, cible_code, code, libelle_action) on true
join public.workflow_etapes src on src.workflow_definition_id = wd.id and src.code = v.source_code
join public.workflow_etapes tgt on tgt.workflow_definition_id = wd.id and tgt.code = v.cible_code
where wd.code = 'mission-standard'
on conflict (workflow_definition_id, code) do nothing;

insert into public.workflow_transition_roles (workflow_transition_id, role_id)
select wt.id, r.id
from public.workflow_transitions wt
join public.workflow_definitions wd on wd.id = wt.workflow_definition_id
join public.roles r on r.organisation_id = wd.organisation_id and r.code in ('directeur', 'directeur-general', 'validateur', 'administrateur')
join (values ('valider-soumission'), ('valider-rapport'), ('cloturer')) as v(code) on v.code = wt.code
where wd.code = 'mission-standard'
on conflict (workflow_transition_id, role_id) do nothing;

insert into public.permissions (role_id, module_id, action_id, portee)
select r.id, m.id, a.id, v.portee::public.portee_permission
from (values
  ('administrateur','missions','consulter','organisation'),
  ('administrateur','missions','creer','organisation'),
  ('administrateur','missions','modifier','organisation'),
  ('administrateur','missions','supprimer','organisation'),
  ('administrateur','missions','affecter','organisation'),
  ('administrateur','missions','valider','organisation'),
  ('directeur-general','missions','consulter','entite_et_descendants'),
  ('directeur-general','missions','valider','entite_et_descendants'),
  ('directeur','missions','consulter','entite_et_descendants'),
  ('directeur','missions','creer','entite_et_descendants'),
  ('directeur','missions','valider','entite_et_descendants'),
  ('agent','missions','consulter','entite'),
  ('validateur','missions','valider','entite_et_descendants')
) as v(role_code, module_code, action_code, portee)
join public.roles r on r.code = v.role_code
join public.modules m on m.code = v.module_code
join public.actions a on a.code = v.action_code
on conflict (role_id, module_id, action_id) do nothing;
