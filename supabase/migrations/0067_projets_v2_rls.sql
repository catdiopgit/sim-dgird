-- Projets V2 (3/3 — RLS) : les policies d'écriture des tables filles sont
-- réécrites autour de app.can_modifier_projet (0066), qui centralise
-- responsable/permission/membre-contributeur et bloque toute écriture une
-- fois la clôture confirmée (§4/§8). Nouvelles tables (avenants, visibilité)
-- protégées par le même patron can_view_projet/can_modifier_projet que le
-- reste du module (0016).
--
-- `public.documents` n'a besoin d'aucun changement de policy ici : sa policy
-- SELECT existante s'appuie sur app.can_view_document, déjà étendue en 0066
-- pour couvrir les documents projet (documents.projet_id).
--
-- Note (§13) : contrairement à workflow_instances (0006, entièrement
-- RPC-managed, REVOKE total possible), `projets` reste normalement
-- modifiable en direct par ses contributeurs (nom, dates, budget...) — seules
-- les colonnes cloture_* doivent être RPC-only. Un revoke/grant colonne par
-- colonne serait fragile ici (dépend des privilèges de base déjà accordés à
-- `authenticated`, non ré-vérifiables sans risquer de casser l'update direct
-- existant) ; on s'appuie donc, comme pour le verrouillage courrier
-- (0047/0048), sur le fait que ces colonnes ne sont écrites que par les RPC
-- dédiées côté frontend — même niveau de garantie que le reste du module.

-- PROJETS : logique équivalente à can_modifier_projet mais explicitée en
-- ligne plutôt que via un appel de fonction, pour éviter tout risque de
-- ré-évaluation récursive de la policy SELECT sur `projets` par la fonction
-- elle-même (can_modifier_projet fait un `select ... from public.projets`,
-- cf. le piège documenté sur createProjet/can_view_projet).
drop policy if exists projets_update on public.projets;
create policy projets_update on public.projets
  for update using (
    organisation_id = app.current_organisation_id()
    and cloture_statut <> 'confirmee'
    and (
      responsable_id = auth.uid()
      or app.has_permission('projets', 'modifier', entite_id)
      or exists (
        select 1 from public.projet_membres pm
        where pm.projet_id = projets.id
          and pm.utilisateur_id = auth.uid()
          and pm.date_retrait is null
          and pm.peut_modifier
      )
    )
  )
  with check (organisation_id = app.current_organisation_id());

-- MEMBRES
drop policy if exists projet_membres_write on public.projet_membres;
create policy projet_membres_write on public.projet_membres
  for all using (app.can_modifier_projet(projet_membres.projet_id))
  with check (app.can_modifier_projet(projet_membres.projet_id));

-- PHASES
drop policy if exists phases_write on public.phases;
create policy phases_write on public.phases
  for all using (app.can_modifier_projet(phases.projet_id))
  with check (app.can_modifier_projet(phases.projet_id));

-- ACTIVITÉS (le responsable de l'activité garde la main dessus même sans
-- droit d'écriture global sur le projet, comme avant V2)
drop policy if exists activites_write on public.activites;
create policy activites_write on public.activites
  for all using (
    activites.responsable_id = auth.uid()
    or exists (
      select 1 from public.phases ph
      where ph.id = activites.phase_id and app.can_modifier_projet(ph.projet_id)
    )
  )
  with check (exists (select 1 from public.phases ph where ph.id = activites.phase_id));

-- TÂCHES (idem : responsable de la tâche conservé)
drop policy if exists taches_write on public.taches;
create policy taches_write on public.taches
  for all using (
    taches.responsable_id = auth.uid()
    or exists (
      select 1 from public.activites a
      join public.phases ph on ph.id = a.phase_id
      where a.id = taches.activite_id and app.can_modifier_projet(ph.projet_id)
    )
  )
  with check (exists (select 1 from public.activites a where a.id = taches.activite_id));

-- LIVRABLES (idem : responsable du livrable conservé — le statut terminal
-- réalisé/validé ne passe cela dit que par fn_cloturer_livrable, 0066)
drop policy if exists livrables_write on public.livrables;
create policy livrables_write on public.livrables
  for all using (
    livrables.responsable_id = auth.uid()
    or exists (
      select 1 from public.activites a
      join public.phases ph on ph.id = a.phase_id
      where a.id = livrables.activite_id and app.can_modifier_projet(ph.projet_id)
    )
  )
  with check (exists (select 1 from public.activites a where a.id = livrables.activite_id));

-- RISQUES / PROBLÈMES / DÉCISIONS / RÉUNIONS / INDICATEURS : même
-- centralisation (remplace la répétition responsable/has_permission propre à
-- chaque table depuis 0016, et hérite au passage du verrou de clôture).
drop policy if exists projet_risques_write on public.projet_risques;
create policy projet_risques_write on public.projet_risques
  for all using (app.can_modifier_projet(projet_risques.projet_id))
  with check (app.can_modifier_projet(projet_risques.projet_id));

drop policy if exists projet_problemes_write on public.projet_problemes;
create policy projet_problemes_write on public.projet_problemes
  for all using (app.can_modifier_projet(projet_problemes.projet_id))
  with check (app.can_modifier_projet(projet_problemes.projet_id));

drop policy if exists projet_decisions_write on public.projet_decisions;
create policy projet_decisions_write on public.projet_decisions
  for all using (app.can_modifier_projet(projet_decisions.projet_id))
  with check (app.can_modifier_projet(projet_decisions.projet_id));

drop policy if exists projet_reunions_write on public.projet_reunions;
create policy projet_reunions_write on public.projet_reunions
  for all using (app.can_modifier_projet(projet_reunions.projet_id))
  with check (app.can_modifier_projet(projet_reunions.projet_id));

drop policy if exists projet_reunion_participants_write on public.projet_reunion_participants;
create policy projet_reunion_participants_write on public.projet_reunion_participants
  for all using (
    exists (
      select 1 from public.projet_reunions r
      where r.id = projet_reunion_participants.reunion_id and app.can_modifier_projet(r.projet_id)
    )
  )
  with check (
    exists (
      select 1 from public.projet_reunions r
      where r.id = projet_reunion_participants.reunion_id and app.can_modifier_projet(r.projet_id)
    )
  );

drop policy if exists projet_indicateurs_write on public.projet_indicateurs;
create policy projet_indicateurs_write on public.projet_indicateurs
  for all using (app.can_modifier_projet(projet_indicateurs.projet_id))
  with check (app.can_modifier_projet(projet_indicateurs.projet_id));

-- §7 AVENANTS
alter table public.avenants enable row level security;

create policy avenants_select on public.avenants
  for select using (app.can_view_projet(avenants.projet_id));

create policy avenants_write on public.avenants
  for all using (app.can_modifier_projet(avenants.projet_id))
  with check (app.can_modifier_projet(avenants.projet_id));

alter table public.avenant_livrables enable row level security;

create policy avenant_livrables_select on public.avenant_livrables
  for select using (
    exists (select 1 from public.avenants av where av.id = avenant_livrables.avenant_id and app.can_view_projet(av.projet_id))
  );

create policy avenant_livrables_write on public.avenant_livrables
  for all using (
    exists (select 1 from public.avenants av where av.id = avenant_livrables.avenant_id and app.can_modifier_projet(av.projet_id))
  )
  with check (
    exists (select 1 from public.avenants av where av.id = avenant_livrables.avenant_id and app.can_modifier_projet(av.projet_id))
  );

-- §5 VISIBILITÉ
alter table public.projet_visibilite_entites enable row level security;

create policy projet_visibilite_entites_select on public.projet_visibilite_entites
  for select using (app.can_view_projet(projet_visibilite_entites.projet_id));

create policy projet_visibilite_entites_write on public.projet_visibilite_entites
  for all using (app.can_modifier_projet(projet_visibilite_entites.projet_id))
  with check (app.can_modifier_projet(projet_visibilite_entites.projet_id));

alter table public.projet_visibilite_utilisateurs enable row level security;

create policy projet_visibilite_utilisateurs_select on public.projet_visibilite_utilisateurs
  for select using (app.can_view_projet(projet_visibilite_utilisateurs.projet_id));

create policy projet_visibilite_utilisateurs_write on public.projet_visibilite_utilisateurs
  for all using (app.can_modifier_projet(projet_visibilite_utilisateurs.projet_id))
  with check (app.can_modifier_projet(projet_visibilite_utilisateurs.projet_id));
