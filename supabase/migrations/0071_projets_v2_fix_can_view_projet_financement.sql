-- La migration 0069 a renommé projets.sponsor_id (uuid, référence utilisateur)
-- en financement (text libre), mais app.can_view_projet (0066) référençait
-- encore v_projet.sponsor_id : ce champ n'existant plus sur le record `select
-- * into v_projet`, la policy projets_select levait une erreur pour chaque
-- ligne, ce qui faisait disparaître tous les projets de la liste (y compris
-- pour l'admin). Financement étant désormais du texte libre (bailleur, ligne
-- budgétaire...) et non plus un utilisateur du système, on retire simplement
-- cette branche d'accès privilégié — elle n'a plus de sens.
create or replace function app.can_view_projet(p_projet_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_projet record;
begin
  select * into v_projet from public.projets where id = p_projet_id;
  if not found then
    return false;
  end if;

  if v_projet.organisation_id <> app.current_organisation_id() then
    return false;
  end if;

  if v_projet.responsable_id = auth.uid()
    or v_projet.coordonnateur_id = auth.uid()
    or app.has_permission('projets', 'consulter', v_projet.entite_id)
  then
    return true;
  end if;

  if exists (
    select 1 from public.projet_membres pm
    where pm.projet_id = p_projet_id and pm.utilisateur_id = auth.uid() and pm.date_retrait is null
  ) then
    return true;
  end if;

  return case v_projet.portee_visibilite
    when 'tous' then true
    when 'entites' then exists (
      select 1 from public.projet_visibilite_entites pve
      where pve.projet_id = p_projet_id and pve.entite_id = app.current_entite_id()
    )
    when 'agents' then exists (
      select 1 from public.projet_visibilite_utilisateurs pvu
      where pvu.projet_id = p_projet_id and pvu.utilisateur_id = auth.uid()
    )
    else false
  end;
end;
$$;
