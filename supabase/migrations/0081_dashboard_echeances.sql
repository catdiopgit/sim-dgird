-- Tableau de bord v2 : échéances à venir, tous modules confondus.
-- Regroupe les livrables de projets (date_prevue, non réalisés) et les
-- actions de suivi de mission (date_echeance, non clôturées) dans un seul
-- appel — même filtrage RLS que les policies existantes
-- (livrables_select: app.can_view_projet, mission_actions_suivi_select:
-- app.can_view_mission, 0016/0074) réappliqué explicitement ici car la
-- fonction est security definer.

create or replace function public.fn_echeances_prochaines(
  p_horizon_jours integer default 30
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'type', echeance.type,
    'id', echeance.id,
    'libelle', echeance.libelle,
    'reference', echeance.reference,
    'dateEcheance', echeance.date_echeance,
    'enRetard', echeance.date_echeance < current_date,
    'lienId', echeance.lien_id
  ) order by echeance.date_echeance), '[]'::jsonb)
  into v_resultat
  from (
    select
      'livrable' as type,
      l.id,
      l.nom as libelle,
      p.nom as reference,
      l.date_prevue as date_echeance,
      p.id as lien_id
    from public.livrables l
    join public.projets p on p.id = l.projet_id
    left join public.valeurs_listes vl on vl.id = l.statut_valeur_id
    where p.organisation_id = v_organisation_id
      and l.date_prevue is not null
      and coalesce(vl.code, '') not in ('realise', 'valide')
      and l.date_prevue <= current_date + (p_horizon_jours || ' days')::interval
      and app.can_view_projet(p.id)

    union all

    select
      'action_mission' as type,
      mas.id,
      mas.description as libelle,
      m.reference,
      mas.date_echeance,
      m.id as lien_id
    from public.mission_actions_suivi mas
    join public.missions m on m.id = mas.mission_id
    left join public.valeurs_listes vl on vl.id = mas.statut_valeur_id
    where m.organisation_id = v_organisation_id
      and mas.date_echeance is not null
      and coalesce(vl.code, '') not in ('realise', 'valide', 'termine')
      and mas.date_echeance <= current_date + (p_horizon_jours || ' days')::interval
      and app.can_view_mission(m.id)
  ) echeance;

  return v_resultat;
end;
$$;

grant execute on function public.fn_echeances_prochaines(integer) to authenticated;
