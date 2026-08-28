-- Gestion des courriers V4 (étape 5/7, cf. plan) : bannette « Courriers de
-- départ » à visibilité hiérarchique ascendante, et {ENTITE}/{CHEMIN_ENTITE}
-- basés sur le sigle plutôt que le code technique (l'exemple du prompt
-- DGDDI/DG/DGA/DIM correspond aux sigles affichés des entités, pas à leurs
-- codes internes type slugs).

-- La visibilité ascendante ("Agent A, Service Informatique, DIM, DG, DGDDI")
-- est déjà couverte par app.can_view_courrier -> has_permission(...,
-- 'entite_et_descendants') dès qu'un rôle avec cette portée existe à chaque
-- niveau hiérarchique concerné (chemin ltree @>, déjà implémenté) — aucune
-- nouvelle traversée d'arbre n'est nécessaire dans la bannette elle-même.
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

  elsif p_bannette = 'sortants' then
    return query
    select c.*
    from public.courriers c
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and c.sens = 'sortant'
      and app.can_view_courrier(c.id);

  else
    raise exception 'Bannette % inconnue', p_bannette;
  end if;
end;
$$;

-- {ENTITE}/{CHEMIN_ENTITE}: coalesce(sigle, code) plutôt que code seul.
create or replace function app.fn_generer_numero(
  p_organisation_id uuid,
  p_module_code text,
  p_entite_id uuid default null,
  p_valeur_liste_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_module_id uuid;
  v_regle record;
  v_annee text := to_char(current_date, 'YYYY');
  v_mois text := to_char(current_date, 'MM');
  v_doit_reinitialiser boolean := false;
  v_numero text;
  v_largeur int;
  v_org_code text;
  v_entite_code text;
  v_chemin_entite text;
begin
  select id into v_module_id from public.modules where code = p_module_code;
  if v_module_id is null then
    raise exception 'Module % introuvable', p_module_code;
  end if;

  select * into v_regle
  from public.regles_numerotation
  where organisation_id = p_organisation_id
    and module_id = v_module_id
    and entite_id is not distinct from p_entite_id
    and valeur_liste_id is not distinct from p_valeur_liste_id
  for update;

  if not found and p_entite_id is not null then
    select * into v_regle
    from public.regles_numerotation
    where organisation_id = p_organisation_id
      and module_id = v_module_id
      and entite_id is null
      and valeur_liste_id is not distinct from p_valeur_liste_id
    for update;
  end if;

  if not found then
    select * into v_regle
    from public.regles_numerotation
    where organisation_id = p_organisation_id
      and module_id = v_module_id
      and entite_id is null
      and valeur_liste_id is null
    for update;
  end if;

  if not found then
    raise exception 'Aucune règle de numérotation pour le module % (organisation %)', p_module_code, p_organisation_id;
  end if;

  if v_regle.reinitialisation = 'annuelle' then
    v_doit_reinitialiser := v_regle.derniere_reinitialisation_le is null
      or date_trunc('year', v_regle.derniere_reinitialisation_le) <> date_trunc('year', current_date);
  elsif v_regle.reinitialisation = 'mensuelle' then
    v_doit_reinitialiser := v_regle.derniere_reinitialisation_le is null
      or date_trunc('month', v_regle.derniere_reinitialisation_le) <> date_trunc('month', current_date);
  end if;

  update public.regles_numerotation
  set sequence_courante = case when v_doit_reinitialiser then 1 else sequence_courante + 1 end,
      derniere_reinitialisation_le = case when v_doit_reinitialiser then current_date else derniere_reinitialisation_le end,
      updated_at = now()
  where id = v_regle.id
  returning sequence_courante into v_regle.sequence_courante;

  v_numero := v_regle.format;
  v_numero := replace(v_numero, '{ANNEE}', v_annee);
  v_numero := replace(v_numero, '{MOIS}', v_mois);

  if v_numero like '%{ORGANISATION}%' then
    select code into v_org_code from public.organisations where id = p_organisation_id;
    v_numero := replace(v_numero, '{ORGANISATION}', coalesce(v_org_code, ''));
  end if;

  if p_entite_id is not null and (v_numero like '%{ENTITE}%' or v_numero like '%{CHEMIN_ENTITE}%') then
    select coalesce(sigle, code) into v_entite_code from public.entites where id = p_entite_id;
    v_numero := replace(v_numero, '{ENTITE}', coalesce(v_entite_code, ''));

    if v_numero like '%{CHEMIN_ENTITE}%' then
      with recursive chaine as (
        select id, parent_entite_id, coalesce(sigle, code) as code, niveau from public.entites where id = p_entite_id
        union all
        select e.id, e.parent_entite_id, coalesce(e.sigle, e.code), e.niveau
        from public.entites e
        join chaine c on e.id = c.parent_entite_id
      )
      select string_agg(code, '/' order by niveau) into v_chemin_entite
      from chaine
      where v_regle.niveau_racine_chemin is null or niveau >= v_regle.niveau_racine_chemin;

      v_numero := replace(v_numero, '{CHEMIN_ENTITE}', coalesce(v_chemin_entite, ''));
    end if;
  else
    v_numero := replace(v_numero, '{ENTITE}', '');
    v_numero := replace(v_numero, '{CHEMIN_ENTITE}', '');
  end if;

  if v_numero ~ '\{SEQ:\d+\}' then
    v_largeur := substring(v_numero from '\{SEQ:(\d+)\}')::int;
    v_numero := regexp_replace(v_numero, '\{SEQ:\d+\}', lpad(v_regle.sequence_courante::text, v_largeur, '0'));
  else
    v_numero := replace(v_numero, '{SEQ}', v_regle.sequence_courante::text);
  end if;

  return v_numero;
end;
$$;
