-- Correctif : le plan de classement est l'arbre des DOSSIERS (ged_dossiers,
-- déjà hiérarchique) — pas une notion séparée de "catégorie". Les fonctions
-- fn_creer_categorie_ged/fn_modifier_categorie_ged (0061) partaient d'une
-- mauvaise compréhension et sont retirées. Le classement se fait document par
-- document (l'archiviste peut affiner par rapport au dossier cible du
-- versement, et créer un nouveau dossier à la volée s'il n'existe pas encore).

drop function if exists public.fn_creer_categorie_ged(text, text, uuid, text, integer);
drop function if exists public.fn_modifier_categorie_ged(uuid, text, text, uuid, boolean, integer, boolean);

-- fn_classer_document: p_categorie_id -> p_dossier_id — même signature de
-- types mais Postgres refuse de renommer un paramètre via CREATE OR REPLACE,
-- DROP requis. Le dossier choisi pour le document prime sur le dossier cible
-- du versement, qui reste la valeur par défaut.
drop function if exists public.fn_classer_document(uuid, text, uuid, text[]);

create or replace function public.fn_classer_document(
  p_document_id uuid,
  p_titre text default null,
  p_dossier_id uuid default null,
  p_mots_cles text[] default null
)
returns public.documents
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_document public.documents;
  v_versement public.ged_versements;
begin
  select * into v_document from public.documents where id = p_document_id;
  if not found then
    raise exception 'Document % introuvable', p_document_id;
  end if;

  if v_document.organisation_id <> app.current_organisation_id() then
    raise exception 'Document % hors de l''organisation courante', p_document_id;
  end if;

  if not app.has_permission('ged', 'modifier', v_document.entite_id) then
    raise exception 'Permission refusée (ged/modifier)';
  end if;

  select * into v_versement from public.ged_versements where id = v_document.versement_id;

  update public.documents
  set titre = coalesce(p_titre, titre),
      dossier_id = coalesce(p_dossier_id, v_versement.dossier_cible_id, dossier_id),
      mots_cles = coalesce(p_mots_cles, mots_cles)
  where id = p_document_id
  returning * into v_document;

  return v_document;
end;
$$;

-- fn_rechercher_documents: retrait du filtre par catégorie (arité changée).
drop function if exists public.fn_rechercher_documents(text, uuid, uuid, uuid);

create or replace function public.fn_rechercher_documents(
  p_texte text default null,
  p_dossier_id uuid default null,
  p_confidentialite_valeur_id uuid default null
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
    and (p_dossier_id is null or d.dossier_id = p_dossier_id)
    and (p_confidentialite_valeur_id is null or d.confidentialite_valeur_id = p_confidentialite_valeur_id)
    and (
      p_texte is null or p_texte = '' or
      d.titre ilike '%' || p_texte || '%' or
      d.description ilike '%' || p_texte || '%' or
      exists (select 1 from unnest(d.mots_cles) mc where mc ilike '%' || p_texte || '%')
    )
  order by d.date_versement desc;
end;
$$;

grant execute on function public.fn_rechercher_documents(text, uuid, uuid) to authenticated;
