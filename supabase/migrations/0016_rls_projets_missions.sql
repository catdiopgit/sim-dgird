-- RLS: Projets et Missions. Même patron que 0015 (fonctions app.can_view_* +
-- policies des tables filles construites dessus).

create or replace function app.can_view_projet(p_projet_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_projet record;
begin
  select * into v_projet from public.projets where id = p_projet_id;
  if not found then
    return false;
  end if;

  if v_projet.organisation_id <> app.current_organisation_id() then
    return false;
  end if;

  if v_projet.entite_id = app.current_entite_id()
    or v_projet.responsable_id = auth.uid()
    or v_projet.sponsor_id = auth.uid()
    or app.has_permission('projets', 'consulter', v_projet.entite_id)
  then
    return true;
  end if;

  return exists (
    select 1 from public.projet_membres pm
    where pm.projet_id = p_projet_id and pm.utilisateur_id = auth.uid() and pm.date_retrait is null
  );
end;
$$;

create or replace function app.can_view_mission(p_mission_id uuid)
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

  if v_mission.entite_id = app.current_entite_id()
    or v_mission.responsable_id = auth.uid()
    or app.has_permission('missions', 'consulter', v_mission.entite_id)
  then
    return true;
  end if;

  return exists (
    select 1 from public.mission_participants mp
    where mp.mission_id = p_mission_id and mp.utilisateur_id = auth.uid()
  );
end;
$$;

-- PROJETS

alter table public.projets enable row level security;

create policy projets_select on public.projets for select using (app.can_view_projet(id));

create policy projets_insert on public.projets
  for insert with check (organisation_id = app.current_organisation_id() and app.has_permission('projets', 'creer', entite_id));

create policy projets_update on public.projets
  for update using (
    organisation_id = app.current_organisation_id()
    and (responsable_id = auth.uid() or app.has_permission('projets', 'modifier', entite_id))
  )
  with check (organisation_id = app.current_organisation_id());

create policy projets_delete on public.projets
  for delete using (app.has_permission('projets', 'supprimer', entite_id));

alter table public.projet_membres enable row level security;

create policy projet_membres_select on public.projet_membres for select using (app.can_view_projet(projet_id));

create policy projet_membres_write on public.projet_membres
  for all using (
    exists (
      select 1 from public.projets p
      where p.id = projet_membres.projet_id
        and (p.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))
    )
  )
  with check (exists (select 1 from public.projets p where p.id = projet_membres.projet_id and p.organisation_id = app.current_organisation_id()));

alter table public.phases enable row level security;

create policy phases_select on public.phases for select using (app.can_view_projet(projet_id));

create policy phases_write on public.phases
  for all using (
    exists (
      select 1 from public.projets p
      where p.id = phases.projet_id
        and (p.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))
    )
  )
  with check (exists (select 1 from public.projets p where p.id = phases.projet_id and p.organisation_id = app.current_organisation_id()));

alter table public.activites enable row level security;

create policy activites_select on public.activites
  for select using (exists (select 1 from public.phases ph where ph.id = activites.phase_id and app.can_view_projet(ph.projet_id)));

create policy activites_write on public.activites
  for all using (
    exists (
      select 1 from public.phases ph
      join public.projets p on p.id = ph.projet_id
      where ph.id = activites.phase_id
        and (p.responsable_id = auth.uid() or activites.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))
    )
  )
  with check (exists (select 1 from public.phases ph where ph.id = activites.phase_id));

alter table public.taches enable row level security;

create policy taches_select on public.taches
  for select using (
    exists (
      select 1 from public.activites a
      join public.phases ph on ph.id = a.phase_id
      where a.id = taches.activite_id and app.can_view_projet(ph.projet_id)
    )
  );

create policy taches_write on public.taches
  for all using (
    exists (
      select 1 from public.activites a
      join public.phases ph on ph.id = a.phase_id
      join public.projets p on p.id = ph.projet_id
      where a.id = taches.activite_id
        and (taches.responsable_id = auth.uid() or p.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))
    )
  )
  with check (exists (select 1 from public.activites a where a.id = taches.activite_id));

alter table public.livrables enable row level security;

create policy livrables_select on public.livrables
  for select using (
    exists (
      select 1 from public.activites a
      join public.phases ph on ph.id = a.phase_id
      where a.id = livrables.activite_id and app.can_view_projet(ph.projet_id)
    )
  );

create policy livrables_write on public.livrables
  for all using (
    exists (
      select 1 from public.activites a
      join public.phases ph on ph.id = a.phase_id
      join public.projets p on p.id = ph.projet_id
      where a.id = livrables.activite_id
        and (livrables.responsable_id = auth.uid() or p.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))
    )
  )
  with check (exists (select 1 from public.activites a where a.id = livrables.activite_id));

alter table public.projet_risques enable row level security;
create policy projet_risques_select on public.projet_risques for select using (app.can_view_projet(projet_id));
create policy projet_risques_write on public.projet_risques
  for all using (exists (select 1 from public.projets p where p.id = projet_risques.projet_id and (p.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))))
  with check (exists (select 1 from public.projets p where p.id = projet_risques.projet_id and p.organisation_id = app.current_organisation_id()));

alter table public.projet_problemes enable row level security;
create policy projet_problemes_select on public.projet_problemes for select using (app.can_view_projet(projet_id));
create policy projet_problemes_write on public.projet_problemes
  for all using (exists (select 1 from public.projets p where p.id = projet_problemes.projet_id and (p.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))))
  with check (exists (select 1 from public.projets p where p.id = projet_problemes.projet_id and p.organisation_id = app.current_organisation_id()));

alter table public.projet_decisions enable row level security;
create policy projet_decisions_select on public.projet_decisions for select using (app.can_view_projet(projet_id));
create policy projet_decisions_write on public.projet_decisions
  for all using (exists (select 1 from public.projets p where p.id = projet_decisions.projet_id and (p.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))))
  with check (exists (select 1 from public.projets p where p.id = projet_decisions.projet_id and p.organisation_id = app.current_organisation_id()));

alter table public.projet_reunions enable row level security;
create policy projet_reunions_select on public.projet_reunions for select using (app.can_view_projet(projet_id));
create policy projet_reunions_write on public.projet_reunions
  for all using (exists (select 1 from public.projets p where p.id = projet_reunions.projet_id and (p.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))))
  with check (exists (select 1 from public.projets p where p.id = projet_reunions.projet_id and p.organisation_id = app.current_organisation_id()));

alter table public.projet_reunion_participants enable row level security;
create policy projet_reunion_participants_select on public.projet_reunion_participants
  for select using (exists (select 1 from public.projet_reunions r where r.id = projet_reunion_participants.reunion_id and app.can_view_projet(r.projet_id)));
create policy projet_reunion_participants_write on public.projet_reunion_participants
  for all using (
    exists (
      select 1 from public.projet_reunions r
      join public.projets p on p.id = r.projet_id
      where r.id = projet_reunion_participants.reunion_id
        and (p.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))
    )
  )
  with check (exists (select 1 from public.projet_reunions r where r.id = projet_reunion_participants.reunion_id));

alter table public.projet_indicateurs enable row level security;
create policy projet_indicateurs_select on public.projet_indicateurs for select using (app.can_view_projet(projet_id));
create policy projet_indicateurs_write on public.projet_indicateurs
  for all using (exists (select 1 from public.projets p where p.id = projet_indicateurs.projet_id and (p.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', p.entite_id))))
  with check (exists (select 1 from public.projets p where p.id = projet_indicateurs.projet_id and p.organisation_id = app.current_organisation_id()));

-- MISSIONS

alter table public.missions enable row level security;

create policy missions_select on public.missions for select using (app.can_view_mission(id));

create policy missions_insert on public.missions
  for insert with check (organisation_id = app.current_organisation_id() and app.has_permission('missions', 'creer', entite_id));

create policy missions_update on public.missions
  for update using (
    organisation_id = app.current_organisation_id()
    and (responsable_id = auth.uid() or app.has_permission('missions', 'modifier', entite_id))
  )
  with check (organisation_id = app.current_organisation_id());

create policy missions_delete on public.missions
  for delete using (app.has_permission('missions', 'supprimer', entite_id));

alter table public.mission_participants enable row level security;
create policy mission_participants_select on public.mission_participants for select using (app.can_view_mission(mission_id));
create policy mission_participants_write on public.mission_participants
  for all using (exists (select 1 from public.missions m where m.id = mission_participants.mission_id and (m.responsable_id = auth.uid() or app.has_permission('missions', 'modifier', m.entite_id))))
  with check (exists (select 1 from public.missions m where m.id = mission_participants.mission_id and m.organisation_id = app.current_organisation_id()));

alter table public.mission_actions_suivi enable row level security;
create policy mission_actions_suivi_select on public.mission_actions_suivi for select using (app.can_view_mission(mission_id));
create policy mission_actions_suivi_write on public.mission_actions_suivi
  for all using (
    exists (
      select 1 from public.missions m
      where m.id = mission_actions_suivi.mission_id
        and (m.responsable_id = auth.uid() or mission_actions_suivi.responsable_id = auth.uid() or app.has_permission('missions', 'modifier', m.entite_id))
    )
  )
  with check (exists (select 1 from public.missions m where m.id = mission_actions_suivi.mission_id and m.organisation_id = app.current_organisation_id()));

alter table public.mission_depenses enable row level security;
create policy mission_depenses_select on public.mission_depenses for select using (app.can_view_mission(mission_id));
create policy mission_depenses_write on public.mission_depenses
  for all using (exists (select 1 from public.missions m where m.id = mission_depenses.mission_id and (m.responsable_id = auth.uid() or app.has_permission('missions', 'modifier', m.entite_id))))
  with check (exists (select 1 from public.missions m where m.id = mission_depenses.mission_id and m.organisation_id = app.current_organisation_id()));
