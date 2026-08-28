-- Notifications par email sur les actions courrier (partie B, suite) :
-- branche app.fn_notifier_destinataires_courrier (0053) sur les 3 actions
-- restantes — Enregistrement, Imputation/Affectation/Transmission/Redirection,
-- Décharge/Clôture. Corps repris à l'identique des dernières définitions
-- (0050, 0042, 0048), seuls les ajouts de notification changent.

-- fn_creer_courrier (dernière définition : 0050) : notifie l'entité vers
-- laquelle le courrier vient d'être routé (créateur exclu, déjà informé
-- puisqu'il vient d'agir — même règle que app.fn_notifier_transition).
create or replace function public.fn_creer_courrier(
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

  perform app.fn_notifier_destinataires_courrier(
    v_courrier.id,
    'Courrier enregistré : ' || coalesce(v_courrier.numero, v_courrier.objet),
    v_courrier.objet,
    auth.uid()
  );

  return v_courrier;
end;
$$;

-- fn_imputer_courrier (dernière définition : 0042) : remplace la notification
-- ad hoc (personne réceptrice seulement) par l'appel générique — la ligne
-- courrier_destinataires "copie" pour la personne réceptrice est conservée
-- (utilisée par la grille Imputation de la fiche d'exploitation, cf.
-- FicheExploitationEntree.tsx), seule la notification ad hoc disparaît,
-- absorbée par fn_notifier_destinataires_courrier.
create or replace function public.fn_imputer_courrier(
  p_courrier_id uuid,
  p_entite_id uuid,
  p_agent_id uuid default null,
  p_instruction text default null,
  p_echeance date default null,
  p_transition_id uuid default null,
  p_commentaire text default null,
  p_type_action public.type_action_courrier default null,
  p_entites_copie_ids uuid[] default null,
  p_actions_demandees_ids uuid[] default null,
  p_priorite_valeur_id uuid default null
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_courrier record;
  v_entite_avant uuid;
  v_personne_receptrice_id uuid;
  v_destinataire_principal_id uuid;
  v_historique_id uuid;
  v_entite_copie_id uuid;
  v_action_demandee_id uuid;
  v_titre_notification text;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  if v_courrier.verrouille_le is not null then
    raise exception 'Courrier % verrouillé (décharge ajoutée) — imputation impossible', p_courrier_id;
  end if;

  if not (
    v_courrier.created_by = auth.uid()
    or app.has_permission('courrier', 'modifier', v_courrier.entite_id)
  ) then
    raise exception 'Permission refusée sur le courrier %', p_courrier_id;
  end if;

  if p_type_action is not null and v_courrier.sens <> 'entrant' then
    raise exception 'Action % réservée aux courriers entrants', p_type_action;
  end if;

  if not app.has_permission('courrier', 'affecter', p_entite_id) then
    raise exception 'Entité % hors du périmètre hiérarchique de l''appelant', p_entite_id;
  end if;

  v_entite_avant := v_courrier.entite_id;

  if p_type_action is distinct from 'transmission' then
    update public.courriers
    set entite_id = p_entite_id,
        agent_destinataire_id = p_agent_id
    where id = p_courrier_id
    returning * into v_courrier;
  end if;

  if p_priorite_valeur_id is not null then
    update public.courriers
    set priorite_valeur_id = p_priorite_valeur_id
    where id = p_courrier_id
    returning * into v_courrier;
  end if;

  insert into public.courrier_destinataires (
    courrier_id, entite_id, utilisateur_id, type_diffusion, instruction, echeance, type_action
  ) values (
    p_courrier_id, p_entite_id, p_agent_id, 'principal', p_instruction, p_echeance, p_type_action
  )
  returning id into v_destinataire_principal_id;

  if p_entites_copie_ids is not null then
    foreach v_entite_copie_id in array p_entites_copie_ids loop
      if not app.has_permission('courrier', 'affecter', v_entite_copie_id) then
        raise exception 'Entité en copie % hors du périmètre hiérarchique de l''appelant', v_entite_copie_id;
      end if;
      insert into public.courrier_destinataires (courrier_id, entite_id, type_diffusion)
      values (p_courrier_id, v_entite_copie_id, 'copie');
    end loop;
  end if;

  if p_actions_demandees_ids is not null then
    foreach v_action_demandee_id in array p_actions_demandees_ids loop
      insert into public.courrier_destinataire_actions (courrier_destinataire_id, valeur_liste_id)
      values (v_destinataire_principal_id, v_action_demandee_id)
      on conflict do nothing;
    end loop;
  end if;

  select personne_receptrice_id into v_personne_receptrice_id
  from public.entites where id = p_entite_id;

  if v_personne_receptrice_id is not null then
    insert into public.courrier_destinataires (courrier_id, utilisateur_id, type_diffusion)
    values (p_courrier_id, v_personne_receptrice_id, 'copie');
  end if;

  if p_transition_id is not null then
    if v_courrier.workflow_instance_id is null then
      raise exception 'Courrier % sans instance de workflow', p_courrier_id;
    end if;

    select app.fn_executer_transition(
      v_courrier.workflow_instance_id, p_transition_id, auth.uid(), p_commentaire, v_entite_avant
    ) into v_historique_id;

    update public.courrier_destinataires
    set workflow_historique_id = v_historique_id
    where id = v_destinataire_principal_id;
  end if;

  v_titre_notification := case p_type_action
    when 'affectation' then 'Courrier affecté : '
    when 'transmission' then 'Courrier transmis : '
    when 'redirection' then 'Courrier redirigé : '
    else 'Courrier imputé : '
  end || coalesce(v_courrier.numero, v_courrier.objet);

  perform app.fn_notifier_destinataires_courrier(
    p_courrier_id, v_titre_notification, p_instruction, auth.uid()
  );

  return v_courrier;
end;
$$;

-- fn_ajouter_decharge_courrier (dernière définition : 0048) : notifie la
-- clôture après la trace workflow_historique déjà écrite.
create or replace function public.fn_ajouter_decharge_courrier(
  p_courrier_id uuid,
  p_storage_path text,
  p_nom_fichier text,
  p_taille_octets bigint default null,
  p_type_mime text default null
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_courrier record;
  v_etape_courante_id uuid;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  if v_courrier.verrouille_le is not null then
    raise exception 'Courrier % déjà verrouillé', p_courrier_id;
  end if;

  if not (
    v_courrier.created_by = auth.uid()
    or app.has_permission('courrier', 'modifier', v_courrier.entite_id)
  ) then
    raise exception 'Permission refusée sur le courrier %', p_courrier_id;
  end if;

  insert into public.courrier_pieces_jointes (
    courrier_id, storage_path, nom_fichier, taille_octets, type_mime, est_decharge, created_by
  ) values (
    p_courrier_id, p_storage_path, p_nom_fichier, p_taille_octets, p_type_mime, true, auth.uid()
  );

  update public.courriers
  set verrouille_le = now(), verrouille_par = auth.uid()
  where id = p_courrier_id
  returning * into v_courrier;

  if v_courrier.sens = 'sortant' and v_courrier.workflow_instance_id is not null then
    update public.workflow_instances
    set statut_instance = 'terminee', termine_le = now()
    where id = v_courrier.workflow_instance_id
      and statut_instance = 'en_cours'
    returning etape_courante_id into v_etape_courante_id;

    if v_etape_courante_id is not null then
      insert into public.workflow_historique (
        workflow_instance_id, transition_id, etape_precedente_id, etape_suivante_id, utilisateur_id, commentaire
      ) values (
        v_courrier.workflow_instance_id, null, v_etape_courante_id, v_etape_courante_id, auth.uid(),
        'Décharge ajoutée — courrier clôturé'
      );

      perform app.fn_notifier_destinataires_courrier(
        p_courrier_id,
        'Courrier clôturé : ' || coalesce(v_courrier.numero, v_courrier.objet),
        'Décharge ajoutée — le courrier est désormais clôturé.',
        auth.uid()
      );
    end if;
  end if;

  return v_courrier;
end;
$$;
