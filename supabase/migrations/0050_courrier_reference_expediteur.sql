-- Fiche d'exploitation "courrier d'arrivée" (modèle DGDDI, cf. documentation/
-- Fiche dexplotation courriers de depart.pdf) : le modèle affiche une "Réf.
-- exp" (référence du courrier telle qu'écrite par l'expéditeur), absente du
-- schéma jusqu'ici (courriers.numero est notre propre numéro interne).

alter table public.courriers add column reference_expediteur text;

-- fn_creer_courrier: + p_reference_expediteur (trailing avant p_observations,
-- même convention que les ajouts précédents — 0026/0028/0030/0032/0041).
-- Ajouter un paramètre change la liste de types -> DROP requis avant CREATE.
-- Corps repris à l'identique de 0041 (dernière définition), seul l'ajout du
-- nouveau paramètre/colonne change.
drop function if exists public.fn_creer_courrier(
  public.sens_courrier, text, uuid, uuid, uuid, uuid, uuid, date, timestamptz, timestamptz,
  text, uuid, text, uuid, uuid, uuid, uuid, uuid, text
);

create function public.fn_creer_courrier(
  p_sens public.sens_courrier,
  p_objet text,
  p_entite_id uuid default null,
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
  p_contact_destinataire_id uuid default null,
  p_statut_reception_valeur_id uuid default null,
  p_expediteur_contact_id uuid default null,
  p_reference_expediteur text default null,
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
  v_entite_id uuid;
  v_numero text;
  v_workflow_instance_id uuid;
  v_workflow_definition_id uuid;
  v_etape_initiale_id uuid;
  v_etape_cible_id uuid;
  v_etape_code text;
  v_etape_libelle text;
  v_transition_id uuid;
  v_expediteur_nom text;
  v_courrier public.courriers;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;

  v_entite_id := p_entite_id;
  if v_entite_id is null then
    v_entite_id := (
      app.fn_parametre_organisation(v_organisation_id, 'courrier.entite_destinataire_initiale_id')
      #>> '{}'
    )::uuid;
  end if;

  if not app.has_permission('courrier', 'creer', v_entite_id) then
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

  -- Expéditeur = contact existant (V5 §2.1) : dénormalise le nom pour rester
  -- compatible avec les affichages existants (CourrierInfoCard,
  -- FicheExploitationModal) qui lisent expediteur_nom directement, sans
  -- aucun changement requis de leur côté.
  v_expediteur_nom := p_expediteur_nom;
  if p_expediteur_contact_id is not null then
    select nom into v_expediteur_nom from public.contacts where id = p_expediteur_contact_id;
  end if;

  v_numero := app.fn_generer_numero(v_organisation_id, 'courrier', v_entite_id, v_sens_valeur_id);
  v_workflow_instance_id := app.fn_demarrer_workflow('courrier', v_organisation_id, auth.uid());

  select wi.workflow_definition_id, wi.etape_courante_id, we.code, we.libelle
  into v_workflow_definition_id, v_etape_initiale_id, v_etape_code, v_etape_libelle
  from public.workflow_instances wi
  join public.workflow_etapes we on we.id = wi.etape_courante_id
  where wi.id = v_workflow_instance_id;

  -- V5 §7-§12 : pour un courrier arrivé, l'étape sur laquelle il est
  -- positionné juste après l'enregistrement est configurable depuis
  -- Administration > Paramètres > Courrier, et cette configuration est
  -- obligatoire (décision validée : aucun courrier arrivé ne doit être créé
  -- sans elle — pas de repli silencieux sur un comportement par défaut).
  if p_sens = 'entrant' then
    v_etape_cible_id := (
      app.fn_parametre_organisation(v_organisation_id, 'courrier.etape_apres_enregistrement_entrant_id')
      #>> '{}'
    )::uuid;

    if v_etape_cible_id is null or not exists (
      select 1 from public.workflow_etapes
      where id = v_etape_cible_id and workflow_definition_id = v_workflow_definition_id
    ) then
      raise exception 'Aucune étape n''est configurée pour l''enregistrement des courriers arrivés. Contactez un administrateur (Administration > Paramètres > Courrier).';
    end if;

    if v_etape_cible_id <> v_etape_initiale_id then
      -- Réutilise l'id d'une transition réelle initiale->cible si elle
      -- existe : la ligne workflow_historique déclenchera alors la
      -- notification générique existante (app.fn_notifier_transition, sur
      -- trg_workflow_historique_notifier) sans aucun code de notification
      -- nouveau. Sinon transition_id reste null, comme la ligne "Démarrage
      -- du workflow" elle-même — aucune notification, comportement identique
      -- à celui de toute transition sans acteurs configurés aujourd'hui.
      select id into v_transition_id
      from public.workflow_transitions
      where workflow_definition_id = v_workflow_definition_id
        and etape_source_id = v_etape_initiale_id
        and etape_cible_id = v_etape_cible_id
      limit 1;

      update public.workflow_instances
      set etape_courante_id = v_etape_cible_id, etape_courante_depuis = now()
      where id = v_workflow_instance_id;

      insert into public.workflow_historique (
        workflow_instance_id, transition_id, etape_precedente_id, etape_suivante_id,
        utilisateur_id, commentaire
      ) values (
        v_workflow_instance_id, v_transition_id, v_etape_initiale_id, v_etape_cible_id,
        auth.uid(), 'Étape initiale automatique (configuration Administration > Paramètres > Courrier)'
      );

      select we.code, we.libelle into v_etape_code, v_etape_libelle
      from public.workflow_etapes we where we.id = v_etape_cible_id;
    end if;
  end if;

  insert into public.courriers (
    organisation_id, entite_id, sens, numero, type_valeur_id, priorite_valeur_id,
    confidentialite_valeur_id, mode_transmission_valeur_id, objet, date_courrier,
    date_reception, date_envoi, expediteur_nom, expediteur_type_valeur_id, expediteur_contact_id,
    destinataire_texte, entite_destinataire_id, agent_destinataire_id, contact_destinataire_id,
    statut_reception_valeur_id, reference_expediteur,
    redacteur_id, workflow_instance_id, etape_code, etape_libelle, observations, created_by
  ) values (
    v_organisation_id, v_entite_id, p_sens, v_numero, p_type_valeur_id,
    p_priorite_valeur_id, p_confidentialite_valeur_id, p_mode_transmission_valeur_id, p_objet,
    coalesce(p_date_courrier, current_date), p_date_reception, p_date_envoi, v_expediteur_nom,
    p_expediteur_type_valeur_id, p_expediteur_contact_id, p_destinataire_texte, p_entite_destinataire_id,
    p_agent_destinataire_id, p_contact_destinataire_id, p_statut_reception_valeur_id, p_reference_expediteur,
    auth.uid(), v_workflow_instance_id, v_etape_code, v_etape_libelle,
    p_observations, auth.uid()
  )
  returning * into v_courrier;

  return v_courrier;
end;
$$;

grant execute on function public.fn_creer_courrier(
  public.sens_courrier, text, uuid, uuid, uuid, uuid, uuid, date, timestamptz, timestamptz,
  text, uuid, text, uuid, uuid, uuid, uuid, uuid, text, text
) to authenticated;
