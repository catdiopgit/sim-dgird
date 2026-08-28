-- Correction de 0037 : pour une policy FOR ALL, la clause USING ne s'applique
-- pas aux INSERT — seule WITH CHECK compte. Le verrouillage n'était donc pas
-- appliqué à l'ajout de nouveaux destinataires/pièces jointes sur un courrier
-- verrouillé (testé: un INSERT passait alors qu'un UPDATE était bloqué).
-- Ajout de la même condition de verrouillage dans WITH CHECK.

drop policy if exists courrier_destinataires_write on public.courrier_destinataires;
create policy courrier_destinataires_write on public.courrier_destinataires
  for all using (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_destinataires.courrier_id
        and (c.created_by = auth.uid() or app.has_permission('courrier', 'modifier', c.entite_id))
        and c.verrouille_le is null
    )
  )
  with check (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_destinataires.courrier_id
        and c.organisation_id = app.current_organisation_id()
        and c.verrouille_le is null
    )
  );

drop policy if exists courrier_pieces_jointes_write on public.courrier_pieces_jointes;
create policy courrier_pieces_jointes_write on public.courrier_pieces_jointes
  for all using (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_pieces_jointes.courrier_id
        and (c.created_by = auth.uid() or app.has_permission('courrier', 'modifier', c.entite_id))
        and c.verrouille_le is null
    )
  )
  with check (
    exists (
      select 1 from public.courriers c
      where c.id = courrier_pieces_jointes.courrier_id
        and c.organisation_id = app.current_organisation_id()
        and c.verrouille_le is null
    )
  );
