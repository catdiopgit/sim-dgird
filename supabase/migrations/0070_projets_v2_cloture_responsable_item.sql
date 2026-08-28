-- Comble un trou du verrou de clôture (§8 étape 4) : les policies d'écriture
-- de activites/taches/livrables (0067) laissent le responsable de l'item lui-
-- même écrire indépendamment de app.can_modifier_projet, qui est le seul
-- endroit à vérifier cloture_statut <> 'confirmee'. Un projet clôturé restait
-- donc modifiable par ces responsables individuels. On fait désormais passer
-- la branche "responsable de l'item" par la même vérification de clôture que
-- can_modifier_projet, en la rejoignant directement à `projets`.

drop policy if exists activites_write on public.activites;
create policy activites_write on public.activites
  for all using (
    exists (
      select 1 from public.phases ph
      join public.projets p on p.id = ph.projet_id
      where ph.id = activites.phase_id
        and p.cloture_statut <> 'confirmee'
        and (activites.responsable_id = auth.uid() or app.can_modifier_projet(ph.projet_id))
    )
  )
  with check (exists (select 1 from public.phases ph where ph.id = activites.phase_id));

drop policy if exists taches_write on public.taches;
create policy taches_write on public.taches
  for all using (
    exists (
      select 1 from public.activites a
      join public.phases ph on ph.id = a.phase_id
      join public.projets p on p.id = ph.projet_id
      where a.id = taches.activite_id
        and p.cloture_statut <> 'confirmee'
        and (taches.responsable_id = auth.uid() or app.can_modifier_projet(ph.projet_id))
    )
  )
  with check (exists (select 1 from public.activites a where a.id = taches.activite_id));

drop policy if exists livrables_write on public.livrables;
create policy livrables_write on public.livrables
  for all using (
    exists (
      select 1 from public.activites a
      join public.phases ph on ph.id = a.phase_id
      join public.projets p on p.id = ph.projet_id
      where a.id = livrables.activite_id
        and p.cloture_statut <> 'confirmee'
        and (livrables.responsable_id = auth.uid() or app.can_modifier_projet(ph.projet_id))
    )
  )
  with check (exists (select 1 from public.activites a where a.id = livrables.activite_id));
