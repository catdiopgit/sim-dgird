-- RLS: Notifications et journal d'audit.

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select using (destinataire_id = auth.uid());

create policy notifications_update on public.notifications
  for update using (destinataire_id = auth.uid())
  with check (destinataire_id = auth.uid());

-- Une notification est créée par l'action d'un tiers (ex. affectation de courrier),
-- donc pas restreinte à destinataire_id = auth.uid(); simplement bornée à la même
-- organisation pour éviter toute fuite entre organisations.
create policy notifications_insert on public.notifications
  for insert with check (
    exists (
      select 1 from public.utilisateurs u
      where u.id = notifications.destinataire_id
        and u.organisation_id = app.current_organisation_id()
    )
  );

create policy notifications_delete on public.notifications
  for delete using (destinataire_id = auth.uid());

alter table public.journal_audit enable row level security;

-- Écriture déjà REVOKE pour `authenticated` en 0013 (seul le trigger SECURITY
-- DEFINER écrit). RLS ici ne définit donc qu'une policy de lecture.
create policy journal_audit_select on public.journal_audit
  for select using (
    organisation_id = app.current_organisation_id()
    and app.has_permission('administration', 'consulter')
  );
