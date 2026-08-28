-- Correction de 0036 : la policy RLS courriers_update laissait quiconque a
-- courrier/deverrouiller écrire *directement* et *silencieusement* sur un
-- courrier verrouillé (simple bypass de condition), ce qui viole l'exigence
-- explicite du prompt V4 §10/§11 ("jamais une modification silencieuse").
-- Correction : le verrouillage devient inconditionnel dans les policies RLS
-- — plus aucune écriture directe n'est possible une fois verrouillé, quel que
-- soit le rôle. Le seul chemin de sortie est fn_deverrouiller_courrier
-- (SECURITY DEFINER, motif obligatoire, journalisé), qui lève le verrou ;
-- une fois déverrouillé, les écritures normales redeviennent possibles.

drop policy if exists courriers_update on public.courriers;
create policy courriers_update on public.courriers
  for update using (
    organisation_id = app.current_organisation_id()
    and (created_by = auth.uid() or app.has_permission('courrier', 'modifier', entite_id))
    and verrouille_le is null
  )
  with check (organisation_id = app.current_organisation_id());

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
      where c.id = courrier_destinataires.courrier_id and c.organisation_id = app.current_organisation_id()
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
      where c.id = courrier_pieces_jointes.courrier_id and c.organisation_id = app.current_organisation_id()
    )
  );
