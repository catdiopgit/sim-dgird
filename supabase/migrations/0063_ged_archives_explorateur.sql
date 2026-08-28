-- Archives V2 (explorateur documentaire) : ajouts rétrocompatibles pour la
-- navigation par dossier et la pagination, sans toucher au workflow ni à la
-- RLS existants.

-- Comptage par dossier des documents archivés visibles par l'utilisateur
-- courant (même filtre que fn_rechercher_documents). dossier_id = null =
-- documents archivés jamais classés ("Non classés"), utilisé par l'arbre du
-- plan de classement affiché dans la page Archives.
create or replace function public.fn_compter_documents_par_dossier()
returns table(dossier_id uuid, nb bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select d.dossier_id, count(*)::bigint
  from public.documents d
  join public.ged_versements v on v.id = d.versement_id
  where d.organisation_id = app.current_organisation_id()
    and d.supprime_le is null
    and v.etape_code = 'archivage'
    and app.can_view_document(d.id)
  group by d.dossier_id;
end;
$$;

grant execute on function public.fn_compter_documents_par_dossier() to authenticated;

-- fn_rechercher_documents : ajout de paramètres en fin de liste, tous avec
-- valeur par défaut (create or replace simple, pas de drop, aucune rupture
-- pour les appelants existants) :
--   - p_seulement_non_classes : force dossier_id is null (dossier virtuel
--     "Non classés" de l'explorateur) ;
--   - p_limite / p_decalage : pagination, pour rester correct avec un volume
--     important de documents.
-- Postgres traite une liste de paramètres différente comme une signature
-- distincte (surcharge) : sans ce drop, l'ancienne fonction à 3 paramètres
-- resterait en place à côté de la nouvelle et un appel PostgREST avec
-- seulement les 3 anciens paramètres nommés deviendrait ambigu entre les
-- deux surcharges (erreur "function is not unique").
drop function if exists public.fn_rechercher_documents(text, uuid, uuid);

create or replace function public.fn_rechercher_documents(
  p_texte text default null,
  p_dossier_id uuid default null,
  p_confidentialite_valeur_id uuid default null,
  p_seulement_non_classes boolean default false,
  p_limite integer default 200,
  p_decalage integer default 0
)
returns setof public.documents
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  return query
  select d.*
  from public.documents d
  join public.ged_versements v on v.id = d.versement_id
  where d.organisation_id = app.current_organisation_id()
    and d.supprime_le is null
    and v.etape_code = 'archivage'
    and app.can_view_document(d.id)
    and (not p_seulement_non_classes or d.dossier_id is null)
    and (p_seulement_non_classes or p_dossier_id is null or d.dossier_id = p_dossier_id)
    and (p_confidentialite_valeur_id is null or d.confidentialite_valeur_id = p_confidentialite_valeur_id)
    and (
      p_texte is null or p_texte = '' or
      d.titre ilike '%' || p_texte || '%' or
      d.description ilike '%' || p_texte || '%' or
      exists (select 1 from unnest(d.mots_cles) mc where mc ilike '%' || p_texte || '%')
    )
  order by d.date_versement desc
  limit greatest(p_limite, 0)
  offset greatest(p_decalage, 0);
end;
$$;

grant execute on function public.fn_rechercher_documents(text, uuid, uuid, boolean, integer, integer) to authenticated;
