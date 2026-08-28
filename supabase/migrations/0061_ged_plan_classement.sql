-- GED V2: gestion du plan de classement (ged_categories) — jusqu'ici seedées
-- une fois sans aucune fonction d'administration. Le plan de classement est
-- l'arbre de catégories (parent_categorie_id, déjà hiérarchique dans le
-- schéma 0008) qui alimente le sélecteur "Catégorie" du Classement
-- documentaire (fn_classer_document, 0058) — pas l'arbre de dossiers
-- (ged_dossiers), qui reste un espace de stockage distinct.

create or replace function public.fn_creer_categorie_ged(
  p_libelle text,
  p_code text,
  p_parent_categorie_id uuid default null,
  p_description text default null,
  p_duree_conservation_mois integer default null
)
returns public.ged_categories
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_categorie public.ged_categories;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;

  -- Le plan de classement est réservé à l'administrateur et à l'archiviste
  -- (rôles disposant de ged/modifier en portée organisation).
  if not app.has_permission('ged', 'modifier') then
    raise exception 'Permission refusée (ged/modifier)';
  end if;

  insert into public.ged_categories (
    organisation_id, parent_categorie_id, code, libelle, description, duree_conservation_mois
  ) values (
    v_organisation_id, p_parent_categorie_id, p_code, p_libelle, p_description, p_duree_conservation_mois
  )
  returning * into v_categorie;

  return v_categorie;
end;
$$;

grant execute on function public.fn_creer_categorie_ged(text, text, uuid, text, integer) to authenticated;

create or replace function public.fn_modifier_categorie_ged(
  p_categorie_id uuid,
  p_libelle text default null,
  p_description text default null,
  p_parent_categorie_id uuid default null,
  p_deplacer boolean default false,
  p_duree_conservation_mois integer default null,
  p_actif boolean default null
)
returns public.ged_categories
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_categorie public.ged_categories;
begin
  select * into v_categorie from public.ged_categories where id = p_categorie_id;
  if not found then
    raise exception 'Catégorie % introuvable', p_categorie_id;
  end if;

  if v_categorie.organisation_id <> app.current_organisation_id() then
    raise exception 'Catégorie % hors de l''organisation courante', p_categorie_id;
  end if;

  if not app.has_permission('ged', 'modifier') then
    raise exception 'Permission refusée (ged/modifier)';
  end if;

  if p_parent_categorie_id is not null and p_parent_categorie_id = p_categorie_id then
    raise exception 'Une catégorie ne peut pas être son propre parent';
  end if;

  update public.ged_categories
  set libelle = coalesce(p_libelle, libelle),
      description = coalesce(p_description, description),
      -- p_deplacer distingue "champ absent" de "déplacer vers la racine"
      -- (p_parent_categorie_id = null explicite), même patron que
      -- fn_modifier_dossier_ged (0056).
      parent_categorie_id = case when p_deplacer then p_parent_categorie_id else parent_categorie_id end,
      duree_conservation_mois = coalesce(p_duree_conservation_mois, duree_conservation_mois),
      actif = coalesce(p_actif, actif)
  where id = p_categorie_id
  returning * into v_categorie;

  return v_categorie;
end;
$$;

grant execute on function public.fn_modifier_categorie_ged(uuid, text, text, uuid, boolean, integer, boolean) to authenticated;
