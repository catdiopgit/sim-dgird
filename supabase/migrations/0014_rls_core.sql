-- RLS: organisation/entités/utilisateurs/rôles/permissions, paramétrage
-- générique et moteur de workflow. Patron commun: SELECT ouvert aux membres de
-- l'organisation, écriture réservée à app.has_permission('administration', ...)
-- sauf mention contraire.

alter table public.organisations enable row level security;

create policy organisations_select on public.organisations
  for select using (id = app.current_organisation_id());

create policy organisations_update on public.organisations
  for update using (app.has_permission('administration', 'modifier'))
  with check (app.has_permission('administration', 'modifier'));

-- Pas de policy INSERT/DELETE: la création d'une organisation est une opération
-- d'amorçage réservée à service_role (bypass RLS), pas à l'app cliente.

alter table public.type_entites enable row level security;

create policy type_entites_select on public.type_entites
  for select using (organisation_id = app.current_organisation_id());

create policy type_entites_write on public.type_entites
  for all using (app.has_permission('administration', 'modifier'))
  with check (organisation_id = app.current_organisation_id());

alter table public.entites enable row level security;

create policy entites_select on public.entites
  for select using (organisation_id = app.current_organisation_id());

create policy entites_write on public.entites
  for all using (app.has_permission('administration', 'modifier'))
  with check (organisation_id = app.current_organisation_id());

alter table public.fonctions enable row level security;

create policy fonctions_select on public.fonctions
  for select using (organisation_id = app.current_organisation_id());

create policy fonctions_write on public.fonctions
  for all using (app.has_permission('administration', 'modifier'))
  with check (organisation_id = app.current_organisation_id());

alter table public.utilisateurs enable row level security;

create policy utilisateurs_select on public.utilisateurs
  for select using (organisation_id = app.current_organisation_id());

-- Auto-consultation/mise à jour (photo, téléphone...) même sans permission admin.
create policy utilisateurs_update_self on public.utilisateurs
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy utilisateurs_write_admin on public.utilisateurs
  for all using (app.has_permission('utilisateurs', 'modifier'))
  with check (organisation_id = app.current_organisation_id());

alter table public.utilisateur_roles enable row level security;

create policy utilisateur_roles_select on public.utilisateur_roles
  for select using (
    exists (
      select 1 from public.utilisateurs u
      where u.id = utilisateur_roles.utilisateur_id
        and u.organisation_id = app.current_organisation_id()
    )
  );

create policy utilisateur_roles_write on public.utilisateur_roles
  for all using (app.has_permission('utilisateurs', 'affecter'))
  with check (
    exists (
      select 1 from public.utilisateurs u
      where u.id = utilisateur_roles.utilisateur_id
        and u.organisation_id = app.current_organisation_id()
    )
  );

alter table public.roles enable row level security;

create policy roles_select on public.roles
  for select using (organisation_id = app.current_organisation_id() or organisation_id is null);

-- Les rôles système (systeme = true, ex. Administrateur) ne sont ni modifiables
-- ni supprimables depuis l'app cliente.
create policy roles_write on public.roles
  for all using (app.has_permission('administration', 'modifier') and not systeme)
  with check (organisation_id = app.current_organisation_id());

alter table public.permissions enable row level security;

create policy permissions_select on public.permissions
  for select using (
    exists (
      select 1 from public.roles r
      where r.id = permissions.role_id
        and (r.organisation_id = app.current_organisation_id() or r.organisation_id is null)
    )
  );

create policy permissions_write on public.permissions
  for all using (app.has_permission('administration', 'modifier'))
  with check (
    exists (
      select 1 from public.roles r
      where r.id = permissions.role_id
        and (r.organisation_id = app.current_organisation_id() or r.organisation_id is null)
    )
  );

-- MODULES/ACTIONS: référentiel système global, lecture ouverte à tout
-- authentifié. Pas de policy d'écriture: réservé à service_role/migrations.
alter table public.modules enable row level security;
create policy modules_select on public.modules for select using (true);

alter table public.actions enable row level security;
create policy actions_select on public.actions for select using (true);

alter table public.listes_valeurs enable row level security;

create policy listes_valeurs_select on public.listes_valeurs
  for select using (organisation_id = app.current_organisation_id());

create policy listes_valeurs_write on public.listes_valeurs
  for all using (app.has_permission('administration', 'modifier'))
  with check (organisation_id = app.current_organisation_id());

alter table public.valeurs_listes enable row level security;

create policy valeurs_listes_select on public.valeurs_listes
  for select using (
    exists (
      select 1 from public.listes_valeurs lv
      where lv.id = valeurs_listes.liste_id
        and lv.organisation_id = app.current_organisation_id()
    )
  );

create policy valeurs_listes_write on public.valeurs_listes
  for all using (app.has_permission('administration', 'modifier'))
  with check (
    exists (
      select 1 from public.listes_valeurs lv
      where lv.id = valeurs_listes.liste_id
        and lv.organisation_id = app.current_organisation_id()
    )
  );

alter table public.regles_numerotation enable row level security;

create policy regles_numerotation_select on public.regles_numerotation
  for select using (organisation_id = app.current_organisation_id());

create policy regles_numerotation_write on public.regles_numerotation
  for all using (app.has_permission('administration', 'modifier'))
  with check (organisation_id = app.current_organisation_id());

alter table public.modeles_courrier enable row level security;

create policy modeles_courrier_select on public.modeles_courrier
  for select using (organisation_id = app.current_organisation_id());

create policy modeles_courrier_write on public.modeles_courrier
  for all using (app.has_permission('administration', 'modifier'))
  with check (organisation_id = app.current_organisation_id());

alter table public.parametres_organisation enable row level security;

create policy parametres_organisation_select on public.parametres_organisation
  for select using (organisation_id = app.current_organisation_id());

create policy parametres_organisation_write on public.parametres_organisation
  for all using (app.has_permission('administration', 'modifier'))
  with check (organisation_id = app.current_organisation_id());

-- Moteur de workflow.

alter table public.workflow_definitions enable row level security;

create policy workflow_definitions_select on public.workflow_definitions
  for select using (organisation_id = app.current_organisation_id());

create policy workflow_definitions_write on public.workflow_definitions
  for all using (app.has_permission('administration', 'modifier'))
  with check (organisation_id = app.current_organisation_id());

alter table public.workflow_etapes enable row level security;

create policy workflow_etapes_select on public.workflow_etapes
  for select using (
    exists (
      select 1 from public.workflow_definitions wd
      where wd.id = workflow_etapes.workflow_definition_id
        and wd.organisation_id = app.current_organisation_id()
    )
  );

create policy workflow_etapes_write on public.workflow_etapes
  for all using (app.has_permission('administration', 'modifier'))
  with check (
    exists (
      select 1 from public.workflow_definitions wd
      where wd.id = workflow_etapes.workflow_definition_id
        and wd.organisation_id = app.current_organisation_id()
    )
  );

alter table public.workflow_transitions enable row level security;

create policy workflow_transitions_select on public.workflow_transitions
  for select using (
    exists (
      select 1 from public.workflow_definitions wd
      where wd.id = workflow_transitions.workflow_definition_id
        and wd.organisation_id = app.current_organisation_id()
    )
  );

create policy workflow_transitions_write on public.workflow_transitions
  for all using (app.has_permission('administration', 'modifier'))
  with check (
    exists (
      select 1 from public.workflow_definitions wd
      where wd.id = workflow_transitions.workflow_definition_id
        and wd.organisation_id = app.current_organisation_id()
    )
  );

alter table public.workflow_transition_roles enable row level security;

create policy workflow_transition_roles_select on public.workflow_transition_roles
  for select using (
    exists (
      select 1 from public.workflow_transitions wt
      join public.workflow_definitions wd on wd.id = wt.workflow_definition_id
      where wt.id = workflow_transition_roles.workflow_transition_id
        and wd.organisation_id = app.current_organisation_id()
    )
  );

create policy workflow_transition_roles_write on public.workflow_transition_roles
  for all using (app.has_permission('administration', 'modifier'))
  with check (
    exists (
      select 1 from public.workflow_transitions wt
      join public.workflow_definitions wd on wd.id = wt.workflow_definition_id
      where wt.id = workflow_transition_roles.workflow_transition_id
        and wd.organisation_id = app.current_organisation_id()
    )
  );

alter table public.workflow_definition_associations enable row level security;

create policy workflow_definition_associations_select on public.workflow_definition_associations
  for select using (
    exists (
      select 1 from public.workflow_definitions wd
      where wd.id = workflow_definition_associations.workflow_definition_id
        and wd.organisation_id = app.current_organisation_id()
    )
  );

create policy workflow_definition_associations_write on public.workflow_definition_associations
  for all using (app.has_permission('administration', 'modifier'))
  with check (
    exists (
      select 1 from public.workflow_definitions wd
      where wd.id = workflow_definition_associations.workflow_definition_id
        and wd.organisation_id = app.current_organisation_id()
    )
  );

alter table public.workflow_instances enable row level security;

-- Visibilité alignée sur l'objet porteur (courrier/document/mission) de la même
-- organisation. Granularité plus fine héritée des policies de ces tables elles-mêmes.
create policy workflow_instances_select on public.workflow_instances
  for select using (
    exists (select 1 from public.courriers c where c.workflow_instance_id = workflow_instances.id and c.organisation_id = app.current_organisation_id())
    or exists (select 1 from public.documents d where d.workflow_instance_id = workflow_instances.id and d.organisation_id = app.current_organisation_id())
    or exists (select 1 from public.missions m where m.workflow_instance_id = workflow_instances.id and m.organisation_id = app.current_organisation_id())
  );

-- Pas de policy INSERT/UPDATE/DELETE: écriture exclusivement via
-- app.fn_demarrer_workflow / app.fn_executer_transition (déjà REVOKE pour
-- `authenticated` en 0006; ces fonctions SECURITY DEFINER, propriétaires de la
-- table, ne sont de toute façon pas soumises à RLS).

alter table public.workflow_historique enable row level security;

create policy workflow_historique_select on public.workflow_historique
  for select using (
    exists (
      select 1 from public.workflow_instances wi
      where wi.id = workflow_historique.workflow_instance_id
        and (
          exists (select 1 from public.courriers c where c.workflow_instance_id = wi.id and c.organisation_id = app.current_organisation_id())
          or exists (select 1 from public.documents d where d.workflow_instance_id = wi.id and d.organisation_id = app.current_organisation_id())
          or exists (select 1 from public.missions m where m.workflow_instance_id = wi.id and m.organisation_id = app.current_organisation_id())
        )
    )
  );
