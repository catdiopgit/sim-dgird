-- Page Statistiques du module Missions + résumé tableau de bord : même
-- patron que fn_statistiques_projets (0076) — une seule fonction
-- d'agrégation, filtrée sur ce que l'utilisateur courant peut voir
-- (app.can_view_mission, 0016) et, si fournis, sur la période
-- (missions.date_depart), l'entité, le responsable et l'étape courante.
--
-- Contrairement à Projets (statut_valeur_id libre), l'état d'une mission
-- est piloté par le workflow (etape_code/etape_libelle, déjà dénormalisés
-- sur missions par app.sync_etape_cache, 0011) — pas de jointure
-- valeurs_listes nécessaire pour la répartition par étape. budget_reel
-- est déjà maintenu à jour par trigger (app.fn_recalculer_budget_reel_mission,
-- 0077), donc les totaux financiers se lisent directement sur missions
-- sans re-sommer mission_depenses.

create or replace function public.fn_statistiques_missions(
  p_date_debut date default null,
  p_date_fin date default null,
  p_entite_id uuid default null,
  p_responsable_id uuid default null,
  p_etape_code text default null
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

  with tmp_missions_visibles as (
    select m.*
    from public.missions m
    where m.organisation_id = v_organisation_id
      and (p_date_debut is null or m.date_depart >= p_date_debut)
      and (p_date_fin is null or m.date_depart <= p_date_fin)
      and (p_entite_id is null or m.entite_id = p_entite_id)
      and (p_responsable_id is null or m.responsable_id = p_responsable_id)
      and (p_etape_code is null or m.etape_code = p_etape_code)
      and app.can_view_mission(m.id)
  ),
  tmp_participants as (
    select mp.mission_id, mp.utilisateur_id
    from public.mission_participants mp
    where mp.mission_id in (select id from tmp_missions_visibles)
  )
  select jsonb_build_object(
    'totaux', (
      select jsonb_build_object(
        'total', count(*),
        'enCours', count(*) filter (where etape_code = 'en-cours'),
        'aVenir', count(*) filter (where date_depart > current_date),
        'enRetard', count(*) filter (where date_retour < current_date and etape_code is distinct from 'cloture'),
        'clotures', count(*) filter (where etape_code = 'cloture')
      )
      from tmp_missions_visibles
    ),
    'dureeMoyenneJours', (
      select round(avg(date_retour - date_depart)::numeric, 1) from tmp_missions_visibles
    ),
    'parEtape', (
      select coalesce(jsonb_agg(jsonb_build_object('code', code, 'libelle', libelle, 'total', total) order by ordre), '[]'::jsonb)
      from (
        select
          tmv.etape_code as code,
          coalesce(tmv.etape_libelle, tmv.etape_code) as libelle,
          count(*) as total,
          min(coalesce(we.ordre, 0)) as ordre
        from tmp_missions_visibles tmv
        left join public.workflow_etapes we on we.workflow_definition_id = (
          select wi.workflow_definition_id from public.workflow_instances wi where wi.id = tmv.workflow_instance_id
        ) and we.code = tmv.etape_code
        where tmv.etape_code is not null
        group by tmv.etape_code, tmv.etape_libelle
      ) t
    ),
    'parEntite', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'libelle', e.libelle, 'total', t.total) order by t.total desc), '[]'::jsonb)
      from (
        select entite_id, count(*) as total
        from tmp_missions_visibles
        group by entite_id
      ) t
      join public.entites e on e.id = t.entite_id
    ),
    'parResponsable', (
      select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'libelle', u.prenom || ' ' || u.nom, 'total', t.total) order by t.total desc), '[]'::jsonb)
      from (
        select responsable_id, count(*) as total
        from tmp_missions_visibles
        where responsable_id is not null
        group by responsable_id
      ) t
      join public.utilisateurs u on u.id = t.responsable_id
    ),
    'financier', (
      select jsonb_build_object(
        'budgetPrevu', coalesce(sum(budget_prevu), 0),
        'budgetReel', coalesce(sum(budget_reel), 0),
        'ecart', coalesce(sum(budget_reel), 0) - coalesce(sum(budget_prevu), 0),
        'pourcentageRealise', case when coalesce(sum(budget_prevu), 0) > 0
          then round(coalesce(sum(budget_reel), 0) / sum(budget_prevu) * 100, 2)
          else 0 end
      )
      from tmp_missions_visibles
    ),
    'participants', (
      select jsonb_build_object(
        'total', count(*),
        'moyenneParMission', case when (select count(*) from tmp_missions_visibles) > 0
          then round(count(*)::numeric / (select count(*) from tmp_missions_visibles), 1)
          else 0 end
      )
      from tmp_participants
    ),
    'evolution', (
      select coalesce(jsonb_agg(jsonb_build_object('date', jour, 'total', total) order by jour), '[]'::jsonb)
      from (
        select date_trunc('day', date_depart)::date as jour, count(*) as total
        from tmp_missions_visibles
        where date_depart is not null
        group by 1
      ) t
    )
  ) into v_resultat;

  return v_resultat;
end;
$$;

grant execute on function public.fn_statistiques_missions(date, date, uuid, uuid, text) to authenticated;
