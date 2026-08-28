-- Page Statistiques du module Projets + résumé tableau de bord : même
-- patron que fn_statistiques_courrier (0055) — une seule fonction
-- d'agrégation (un aller-retour réseau, un seul état de chargement côté
-- client), filtrée sur ce que l'utilisateur courant peut voir
-- (app.can_view_projet, 0066/0073) et, si fournis, sur la période
-- (projets.date_debut) et les filtres statut/responsable/organisme
-- d'exécution. Livrables/avenants/décaissements sont joints sur les
-- projets déjà filtrés par visibilité — pas de second contrôle can_view_*
-- nécessaire (ce sont des tables filles du projet).

create or replace function public.fn_statistiques_projets(
  p_date_debut date default null,
  p_date_fin date default null,
  p_statut_valeur_id uuid default null,
  p_responsable_id uuid default null,
  p_organisme_execution_type public.organisme_execution_type default null
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

  with tmp_projets_visibles as (
    select p.*
    from public.projets p
    where p.organisation_id = v_organisation_id
      and (p_date_debut is null or p.date_debut >= p_date_debut)
      and (p_date_fin is null or p.date_debut <= p_date_fin)
      and (p_statut_valeur_id is null or p.statut_valeur_id = p_statut_valeur_id)
      and (p_responsable_id is null or p.responsable_id = p_responsable_id)
      and (p_organisme_execution_type is null or p.organisme_execution_type = p_organisme_execution_type)
      and app.can_view_projet(p.id)
  ),
  tmp_avenants as (
    select a.projet_id, a.montant
    from public.avenants a
    where a.projet_id in (select id from tmp_projets_visibles)
  ),
  tmp_decaissements as (
    select d.projet_id, d.montant
    from public.decaissements d
    where d.projet_id in (select id from tmp_projets_visibles)
  ),
  tmp_livrables as (
    select l.projet_id, l.statut_valeur_id
    from public.livrables l
    where l.projet_id in (select id from tmp_projets_visibles)
  )
  select jsonb_build_object(
    'totaux', (
      select jsonb_build_object(
        'total', count(*),
        'enCours', count(*) filter (where vl.code = 'en-cours'),
        'aVenir', count(*) filter (where vl.code = 'a-faire'),
        'enRetard', count(*) filter (where vl.code = 'en-retard'),
        'clotures', count(*) filter (where tpv.cloture_statut = 'confirmee')
      )
      from tmp_projets_visibles tpv
      left join public.valeurs_listes vl on vl.id = tpv.statut_valeur_id
    ),
    'avancementMoyen', (
      select round(avg(avancement_pct)::numeric, 1) from tmp_projets_visibles
    ),
    'parEtat', (
      select coalesce(jsonb_agg(jsonb_build_object('id', vl.id, 'libelle', vl.libelle, 'couleur', vl.couleur, 'total', t.total) order by t.total desc), '[]'::jsonb)
      from (
        select statut_valeur_id, count(*) as total
        from tmp_projets_visibles
        where statut_valeur_id is not null
        group by statut_valeur_id
      ) t
      join public.valeurs_listes vl on vl.id = t.statut_valeur_id
    ),
    'parOrganisme', (
      select coalesce(jsonb_agg(jsonb_build_object('cle', organisme_execution_type, 'total', total) order by total desc), '[]'::jsonb)
      from (
        select organisme_execution_type, count(*) as total
        from tmp_projets_visibles
        group by organisme_execution_type
      ) t
    ),
    'parResponsable', (
      select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'libelle', u.prenom || ' ' || u.nom, 'total', t.total) order by t.total desc), '[]'::jsonb)
      from (
        select responsable_id, count(*) as total
        from tmp_projets_visibles
        where responsable_id is not null
        group by responsable_id
      ) t
      join public.utilisateurs u on u.id = t.responsable_id
    ),
    'financier', (
      select jsonb_build_object(
        'montantProjets', coalesce(sum_p.total, 0),
        'montantAvenants', coalesce(sum_a.total, 0),
        'montantContractuel', coalesce(sum_p.total, 0) + coalesce(sum_a.total, 0),
        'montantDecaisse', coalesce(sum_d.total, 0),
        'pourcentageDecaisse', case when coalesce(sum_p.total, 0) + coalesce(sum_a.total, 0) > 0
          then round(coalesce(sum_d.total, 0) / (coalesce(sum_p.total, 0) + coalesce(sum_a.total, 0)) * 100, 2)
          else 0 end,
        'resteADecaisser', coalesce(sum_p.total, 0) + coalesce(sum_a.total, 0) - coalesce(sum_d.total, 0)
      )
      from (select sum(budget_prevu) as total from tmp_projets_visibles) sum_p,
           (select sum(montant) as total from tmp_avenants) sum_a,
           (select sum(montant) as total from tmp_decaissements) sum_d
    ),
    'livrables', (
      select jsonb_build_object(
        'total', count(*),
        'realises', count(*) filter (where vl.code in ('realise', 'valide')),
        'enCoursOuNonRealises', count(*) filter (where vl.code is null or vl.code not in ('realise', 'valide')),
        'tauxRealisation', case when count(*) > 0
          then round(count(*) filter (where vl.code in ('realise', 'valide'))::numeric / count(*) * 100, 1)
          else 0 end
      )
      from tmp_livrables tl
      left join public.valeurs_listes vl on vl.id = tl.statut_valeur_id
    ),
    'evolution', (
      select coalesce(jsonb_agg(jsonb_build_object('date', jour, 'total', total) order by jour), '[]'::jsonb)
      from (
        select date_trunc('day', date_debut)::date as jour, count(*) as total
        from tmp_projets_visibles
        where date_debut is not null
        group by 1
      ) t
    )
  ) into v_resultat;

  return v_resultat;
end;
$$;

grant execute on function public.fn_statistiques_projets(date, date, uuid, uuid, public.organisme_execution_type) to authenticated;
