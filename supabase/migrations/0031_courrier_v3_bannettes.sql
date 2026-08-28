-- Gestion des courriers V3 (étape 6/8, cf. plan) : architecture des
-- bannettes — une fonction unique paramétrée par bannette, réutilisant les
-- briques déjà éprouvées du moteur (can_view_courrier, acteur_de_transition_
-- autorise, fn_condition_satisfaite, délai/etape_courante_depuis) plutôt que
-- des vues figées par bannette. Seules 3 bannettes dont la règle est déjà
-- déductible de l'existant sont implémentées ici (« à traiter », « en
-- retard », « archivés ») ; « en cours », « sortants », « traités » suivront
-- une fois leurs règles fines précisées (cf. §H du plan — ne pas
-- sur-construire cette partie maintenant).

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
      and we.delai_jours is not null
      and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now()
      and app.can_view_courrier(c.id);

  elsif p_bannette = 'archives' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and we.type_etape = 'finale'
      and app.can_view_courrier(c.id);

  else
    raise exception 'Bannette % inconnue', p_bannette;
  end if;
end;
$$;

grant execute on function public.fn_bannettes_courrier(text) to authenticated;
