-- fn_creer_courrier appelait app.fn_demarrer_workflow sans p_valeur_liste_id,
-- ce qui empêchait toute organisation d'avoir des circuits différents par sens
-- (entrant/sortant/interne) malgré workflow_definition_associations déjà
-- prévu à cet effet (0007) — cf. prompts/Configuration workflow.txt §10.
-- On câble désormais le sens du courrier comme clé d'association.

create or replace function public.fn_creer_courrier(
  p_entite_id uuid,
  p_sens public.sens_courrier,
  p_objet text,
  p_type_valeur_id uuid default null,
  p_priorite_valeur_id uuid default null,
  p_confidentialite_valeur_id uuid default null,
  p_mode_transmission_valeur_id uuid default null,
  p_date_courrier date default current_date,
  p_date_reception timestamptz default null,
  p_date_envoi timestamptz default null,
  p_expediteur_nom text default null,
  p_expediteur_type_valeur_id uuid default null,
  p_destinataire_texte text default null,
  p_entite_destinataire_id uuid default null,
  p_agent_destinataire_id uuid default null,
  p_observations text default null
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_sens_valeur_id uuid;
  v_numero text;
  v_workflow_instance_id uuid;
  v_etape_code text;
  v_etape_libelle text;
  v_courrier public.courriers;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;

  if not app.has_permission('courrier', 'creer', p_entite_id) then
    raise exception 'Permission refusée (courrier/creer)';
  end if;

  select vl.id into v_sens_valeur_id
  from public.valeurs_listes vl
  join public.listes_valeurs lv on lv.id = vl.liste_id
  where lv.organisation_id = v_organisation_id
    and lv.code = 'courrier_sens'
    and vl.code = p_sens::text;

  if v_sens_valeur_id is null then
    raise exception 'Valeur de liste courrier_sens introuvable pour %', p_sens;
  end if;

  v_numero := app.fn_generer_numero(v_organisation_id, 'courrier', null, v_sens_valeur_id);
  -- Sens du courrier utilisé comme clé d'association: une organisation peut
  -- définir un circuit distinct pour entrant/sortant/interne via
  -- workflow_definition_associations (repli automatique sur le workflow
  -- est_defaut du module si aucune association n'est configurée).
  v_workflow_instance_id := app.fn_demarrer_workflow('courrier', v_organisation_id, auth.uid(), v_sens_valeur_id);

  select we.code, we.libelle
  into v_etape_code, v_etape_libelle
  from public.workflow_instances wi
  join public.workflow_etapes we on we.id = wi.etape_courante_id
  where wi.id = v_workflow_instance_id;

  insert into public.courriers (
    organisation_id, entite_id, sens, numero, type_valeur_id, priorite_valeur_id,
    confidentialite_valeur_id, mode_transmission_valeur_id, objet, date_courrier,
    date_reception, date_envoi, expediteur_nom, expediteur_type_valeur_id,
    destinataire_texte, entite_destinataire_id, agent_destinataire_id,
    redacteur_id, workflow_instance_id, etape_code, etape_libelle, observations, created_by
  ) values (
    v_organisation_id, p_entite_id, p_sens, v_numero, p_type_valeur_id,
    p_priorite_valeur_id, p_confidentialite_valeur_id, p_mode_transmission_valeur_id, p_objet,
    coalesce(p_date_courrier, current_date), p_date_reception, p_date_envoi, p_expediteur_nom,
    p_expediteur_type_valeur_id, p_destinataire_texte, p_entite_destinataire_id,
    p_agent_destinataire_id, auth.uid(), v_workflow_instance_id, v_etape_code, v_etape_libelle,
    p_observations, auth.uid()
  )
  returning * into v_courrier;

  return v_courrier;
end;
$$;
