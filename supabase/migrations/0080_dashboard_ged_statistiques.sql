-- Tableau de bord v2 : statistiques GED (aucune fonction d'agrégation
-- n'existait pour ce module, cf. fn_statistiques_courrier/projets/missions).
-- Même patron : un seul aller-retour réseau, filtré par app.can_view_document
-- (même périmètre que les policies documents_select/etc., 0015).

create or replace function public.fn_statistiques_ged(
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

  with tmp_documents_visibles as (
    select d.*
    from public.documents d
    where d.organisation_id = v_organisation_id
      and d.supprime_le is null
      and app.can_view_document(d.id)
  )
  select jsonb_build_object(
    'totaux', (
      select jsonb_build_object(
        'total', count(*),
        'ajoutesPeriode', count(*) filter (
          where (p_date_debut is null or date_versement::date >= p_date_debut)
            and (p_date_fin is null or date_versement::date <= p_date_fin)
        )
      )
      from tmp_documents_visibles
    ),
    'parEtape', (
      select coalesce(jsonb_agg(jsonb_build_object('code', t.etape_code, 'libelle', t.etape_libelle, 'total', t.total) order by t.total desc), '[]'::jsonb)
      from (
        select etape_code, coalesce(etape_libelle, etape_code, 'Sans étape') as etape_libelle, count(*) as total
        from tmp_documents_visibles
        where etape_code is not null
        group by etape_code, etape_libelle
      ) t
    ),
    'evolution', (
      select coalesce(jsonb_agg(jsonb_build_object('date', jour, 'total', total) order by jour), '[]'::jsonb)
      from (
        select date_trunc('day', date_versement)::date as jour, count(*) as total
        from tmp_documents_visibles
        where (p_date_debut is null or date_versement::date >= p_date_debut)
          and (p_date_fin is null or date_versement::date <= p_date_fin)
        group by 1
      ) t
    )
  ) into v_resultat;

  return v_resultat;
end;
$$;

grant execute on function public.fn_statistiques_ged(date, date) to authenticated;
