-- documents.date_archivage n'était jamais renseignée : ajoute cet horodatage
-- dans app.sync_etape_cache quand l'étape atteinte est de type 'finale' pour
-- un versement GED (miroir du principe déjà appliqué pour brouillon/'rejet').

create or replace function app.sync_etape_cache()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_libelle text;
  v_type_etape public.type_etape_workflow;
begin
  select code, libelle, type_etape into v_code, v_libelle, v_type_etape
  from public.workflow_etapes
  where id = new.etape_suivante_id;

  update public.courriers
  set etape_code = v_code, etape_libelle = v_libelle
  where workflow_instance_id = new.workflow_instance_id;

  update public.ged_versements
  set etape_code = v_code, etape_libelle = v_libelle,
      brouillon = case when v_type_etape = 'rejet' then true else brouillon end
  where workflow_instance_id = new.workflow_instance_id;

  if v_type_etape = 'finale' then
    update public.documents d
    set date_archivage = now()
    from public.ged_versements v
    where v.workflow_instance_id = new.workflow_instance_id
      and d.versement_id = v.id
      and d.date_archivage is null;
  end if;

  update public.missions
  set etape_code = v_code, etape_libelle = v_libelle
  where workflow_instance_id = new.workflow_instance_id;

  return new;
end;
$$;

-- Backfill: documents déjà archivés (versement à l'étape finale) mais sans
-- date_archivage, faute de ce trigger avant aujourd'hui.
update public.documents d
set date_archivage = coalesce(d.date_archivage, d.updated_at)
from public.ged_versements v
join public.workflow_instances wi on wi.id = v.workflow_instance_id
join public.workflow_etapes we on we.id = wi.etape_courante_id
where d.versement_id = v.id
  and we.type_etape = 'finale'
  and d.date_archivage is null;
