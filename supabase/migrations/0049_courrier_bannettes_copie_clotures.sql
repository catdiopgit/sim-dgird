-- Deux nouvelles bannettes courrier (même architecture que 0020/0047 : une
-- branche par bannette dans fn_bannettes_courrier, aucune logique dupliquée
-- côté client) :
--   - 'en_copie'  : courriers où l'utilisateur courant est ampliataire, en
--     direct (courrier_destinataires.utilisateur_id) ou via son entité de
--     rattachement (courrier_destinataires.entite_id) — les deux façons dont
--     une copie est enregistrée (cf. fn_imputer_courrier, 0042).
--   - 'clotures'  : symétrique de 'sortants' côté arrivée — courriers
--     entrants dont le workflow est terminé (même critère que 'archives',
--     restreint à sens = 'entrant').

create or replace function public.fn_bannettes_courrier(p_bannette text)
returns setof public.courriers
language plpgsql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
begin
  if p_bannette = 'a_traiter' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and wi.statut_instance = 'en_cours'
      and app.can_view_courrier(c.id)
      and exists (
        select 1
        from public.workflow_transitions wt
        where wt.workflow_definition_id = wi.workflow_definition_id
          and (wt.etape_source_id = wi.etape_courante_id or wt.etape_source_id is null)
          and app.acteur_de_transition_autorise(wt.id, auth.uid(), c.entite_id)
          and app.fn_condition_satisfaite(wt.condition, to_jsonb(c))
      );

  elsif p_bannette = 'en_retard' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and wi.statut_instance = 'en_cours'
      and (
        (we.delai_jours is not null and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now())
        or exists (
          select 1 from public.courrier_destinataires cd
          where cd.courrier_id = c.id
            and cd.type_diffusion = 'principal'
            and cd.echeance is not null
            and cd.echeance < current_date
        )
      )
      and app.can_view_courrier(c.id);

  elsif p_bannette = 'archives' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and (we.type_etape = 'finale' or wi.statut_instance = 'terminee')
      and app.can_view_courrier(c.id);

  elsif p_bannette = 'sortants' then
    return query
    select c.*
    from public.courriers c
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and c.sens = 'sortant'
      and app.can_view_courrier(c.id);

  elsif p_bannette = 'en_copie' then
    return query
    select distinct c.*
    from public.courriers c
    join public.courrier_destinataires cd on cd.courrier_id = c.id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and cd.type_diffusion = 'copie'
      and (
        cd.utilisateur_id = auth.uid()
        or cd.entite_id in (select u.entite_id from public.utilisateurs u where u.id = auth.uid())
      )
      and app.can_view_courrier(c.id);

  elsif p_bannette = 'clotures' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and c.sens = 'entrant'
      and (we.type_etape = 'finale' or wi.statut_instance = 'terminee')
      and app.can_view_courrier(c.id);

  else
    raise exception 'Bannette % inconnue', p_bannette;
  end if;
end;
$$;
