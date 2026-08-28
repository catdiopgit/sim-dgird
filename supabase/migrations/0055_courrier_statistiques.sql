-- Page Statistiques du module Courrier + résumé tableau de bord : une seule
-- fonction d'agrégation (un aller-retour réseau, un seul état de chargement
-- côté client), filtrée sur ce que l'utilisateur courant peut voir
-- (app.can_view_courrier, 0015 — même périmètre que les bannettes, 0020/0047/
-- 0049) et, si fournie, sur la période demandée (courriers.date_courrier).

create or replace function public.fn_statistiques_courrier(
  p_date_debut date default null,
  p_date_fin date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_resultat jsonb;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;

  -- CTE référencée plusieurs fois dans la requête ci-dessous -> matérialisée
  -- une seule fois par Postgres (comportement par défaut dès qu'une CTE est
  -- utilisée plus d'une fois), pas de table temporaire nécessaire.
  with tmp_courriers_visibles as (
    select c.*
    from public.courriers c
    where c.organisation_id = v_organisation_id
      and c.supprime_le is null
      and (p_date_debut is null or c.date_courrier >= p_date_debut)
      and (p_date_fin is null or c.date_courrier <= p_date_fin)
      and app.can_view_courrier(c.id)
  )
  select jsonb_build_object(
    'totaux', (
      select jsonb_build_object(
        'total', count(*),
        'entrant', count(*) filter (where sens = 'entrant'),
        'sortant', count(*) filter (where sens = 'sortant'),
        'interne', count(*) filter (where sens = 'interne')
      )
      from tmp_courriers_visibles
    ),
    'parEtat', (
      select jsonb_build_object(
        'enCours', count(*) filter (
          where wi.statut_instance = 'en_cours'
            and not (we.delai_jours is not null and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now())
        ),
        'enRetard', count(*) filter (
          where wi.statut_instance = 'en_cours'
            and we.delai_jours is not null
            and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now()
        ),
        'clotures', count(*) filter (where wi.statut_instance = 'terminee')
      )
      from tmp_courriers_visibles cv
      join public.workflow_instances wi on wi.id = cv.workflow_instance_id
      left join public.workflow_etapes we on we.id = wi.etape_courante_id
    ),
    'parEntite', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'libelle', e.libelle, 'total', t.total) order by t.total desc), '[]'::jsonb)
      from (
        select entite_id, count(*) as total
        from tmp_courriers_visibles
        where entite_id is not null
        group by entite_id
      ) t
      join public.entites e on e.id = t.entite_id
    ),
    'parType', (
      select coalesce(jsonb_agg(jsonb_build_object('id', vl.id, 'libelle', vl.libelle, 'total', t.total) order by t.total desc), '[]'::jsonb)
      from (
        select type_valeur_id, count(*) as total
        from tmp_courriers_visibles
        where type_valeur_id is not null
        group by type_valeur_id
      ) t
      join public.valeurs_listes vl on vl.id = t.type_valeur_id
    ),
    'parPriorite', (
      select coalesce(jsonb_agg(jsonb_build_object('id', vl.id, 'libelle', vl.libelle, 'total', t.total) order by t.total desc), '[]'::jsonb)
      from (
        select priorite_valeur_id, count(*) as total
        from tmp_courriers_visibles
        where priorite_valeur_id is not null
        group by priorite_valeur_id
      ) t
      join public.valeurs_listes vl on vl.id = t.priorite_valeur_id
    ),
    'delaiMoyenJours', (
      select round(avg(extract(epoch from (wi.termine_le - cv.created_at)) / 86400)::numeric, 1)
      from tmp_courriers_visibles cv
      join public.workflow_instances wi on wi.id = cv.workflow_instance_id
      where wi.termine_le is not null
    ),
    'evolution', (
      select coalesce(jsonb_agg(jsonb_build_object('date', jour, 'total', total) order by jour), '[]'::jsonb)
      from (
        select date_trunc('day', date_courrier)::date as jour, count(*) as total
        from tmp_courriers_visibles
        group by 1
      ) t
    )
  ) into v_resultat;

  return v_resultat;
end;
$$;

grant execute on function public.fn_statistiques_courrier(date, date) to authenticated;
