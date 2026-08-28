-- Projets V3 (3/3 — RLS) : livrables se sélectionnent/s'écrivent désormais
-- via leur projet_id direct (plus de join activite/phase). Nouvelles tables
-- (décaissements, contacts d'exécution) protégées par le même patron
-- can_view_projet/can_modifier_projet que le reste du module (avenants,
-- 0067). Les policies de phases/activites/taches ne sont pas touchées : ces
-- tables restent en base mais l'application ne les sollicite plus (voir
-- 0072) — pas besoin d'y toucher, elles ne représentent aucun risque restées
-- telles quelles.

drop policy if exists livrables_select on public.livrables;
create policy livrables_select on public.livrables
  for select using (app.can_view_projet(livrables.projet_id));

drop policy if exists livrables_write on public.livrables;
create policy livrables_write on public.livrables
  for all using (
    livrables.responsable_utilisateur_id = auth.uid()
    or app.can_modifier_projet(livrables.projet_id)
  )
  with check (
    livrables.responsable_utilisateur_id = auth.uid()
    or app.can_modifier_projet(livrables.projet_id)
  );

alter table public.projet_contacts_execution enable row level security;

create policy projet_contacts_execution_select on public.projet_contacts_execution
  for select using (app.can_view_projet(projet_contacts_execution.projet_id));

create policy projet_contacts_execution_write on public.projet_contacts_execution
  for all using (app.can_modifier_projet(projet_contacts_execution.projet_id))
  with check (app.can_modifier_projet(projet_contacts_execution.projet_id));

alter table public.decaissements enable row level security;

create policy decaissements_select on public.decaissements
  for select using (app.can_view_projet(decaissements.projet_id));

create policy decaissements_write on public.decaissements
  for all using (app.can_modifier_projet(decaissements.projet_id))
  with check (app.can_modifier_projet(decaissements.projet_id));
