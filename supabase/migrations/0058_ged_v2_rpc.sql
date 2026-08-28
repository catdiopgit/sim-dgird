-- GED V2: ponts RPC pour le modèle "versement" (remplace les fonctions V1
-- portant sur un document individuel, migration 0056).

drop function if exists public.fn_creer_document(text, uuid, text, uuid, uuid, uuid, integer);
drop function if exists public.fn_transitions_disponibles_document(uuid);
drop function if exists public.fn_executer_transition_document(uuid, uuid, text);

-- Versements ---------------------------------------------------------------

create or replace function public.fn_creer_versement(
  p_objet text,
  p_entite_id uuid default null,
  p_dossier_cible_id uuid default null,
  p_description text default null
)
returns public.ged_versements
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_versement public.ged_versements;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;

  if not app.has_permission('ged', 'creer', p_entite_id) then
    raise exception 'Permission refusée (ged/creer)';
  end if;

  insert into public.ged_versements (
    organisation_id, entite_id, dossier_cible_id, objet, description, brouillon, redacteur_id
  ) values (
    v_organisation_id, p_entite_id, p_dossier_cible_id, p_objet, p_description, true, auth.uid()
  )
  returning * into v_versement;

  return v_versement;
end;
$$;

grant execute on function public.fn_creer_versement(text, uuid, uuid, text) to authenticated;

create or replace function public.fn_ajouter_document_versement(
  p_versement_id uuid,
  p_titre text,
  p_description text default null,
  p_categorie_id uuid default null,
  p_confidentialite_valeur_id uuid default null,
  p_duree_conservation_mois integer default null
)
returns public.documents
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_versement public.ged_versements;
  v_document public.documents;
begin
  select * into v_versement from public.ged_versements where id = p_versement_id;
  if not found then
    raise exception 'Versement % introuvable', p_versement_id;
  end if;

  if v_versement.organisation_id <> app.current_organisation_id() then
    raise exception 'Versement % hors de l''organisation courante', p_versement_id;
  end if;

  if not v_versement.brouillon then
    raise exception 'Le versement % n''est plus modifiable (déjà soumis)', p_versement_id;
  end if;

  if not (v_versement.redacteur_id = auth.uid() or app.has_permission('ged', 'modifier', v_versement.entite_id)) then
    raise exception 'Permission refusée sur le versement %', p_versement_id;
  end if;

  insert into public.documents (
    organisation_id, versement_id, entite_id, categorie_id, titre, description,
    confidentialite_valeur_id, duree_conservation_mois, created_by
  ) values (
    v_versement.organisation_id, p_versement_id, v_versement.entite_id, p_categorie_id, p_titre, p_description,
    p_confidentialite_valeur_id, p_duree_conservation_mois, auth.uid()
  )
  returning * into v_document;

  return v_document;
end;
$$;

grant execute on function public.fn_ajouter_document_versement(uuid, text, text, uuid, uuid, integer) to authenticated;

-- Démarre le workflow (soumission) — valable aussi bien pour la première
-- soumission que pour une resoumission après "Demande de correction" (le
-- versement est repassé en brouillon par app.sync_etape_cache en atteignant
-- l'étape "À corriger" ; une nouvelle instance de workflow est alors créée
-- ici, l'historique de la précédente restant consultable).
create or replace function public.fn_soumettre_versement(p_versement_id uuid)
returns public.ged_versements
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_versement public.ged_versements;
  v_nb_documents integer;
  v_workflow_instance_id uuid;
  v_etape_code text;
  v_etape_libelle text;
begin
  select * into v_versement from public.ged_versements where id = p_versement_id for update;
  if not found then
    raise exception 'Versement % introuvable', p_versement_id;
  end if;

  if v_versement.organisation_id <> app.current_organisation_id() then
    raise exception 'Versement % hors de l''organisation courante', p_versement_id;
  end if;

  if not v_versement.brouillon then
    raise exception 'Le versement % a déjà été soumis', p_versement_id;
  end if;

  if not (v_versement.redacteur_id = auth.uid() or app.has_permission('ged', 'modifier', v_versement.entite_id)) then
    raise exception 'Permission refusée sur le versement %', p_versement_id;
  end if;

  select count(*) into v_nb_documents from public.documents where versement_id = p_versement_id;
  if v_nb_documents = 0 then
    raise exception 'Le versement % ne contient aucun document', p_versement_id;
  end if;

  v_workflow_instance_id := app.fn_demarrer_workflow('ged', v_versement.organisation_id, auth.uid());

  -- Comme fn_creer_document (0056): le trigger app.sync_etape_cache ne peut
  -- pas encore avoir agi puisque cette ligne ged_versements n'a pas encore
  -- workflow_instance_id au moment de l'appel ci-dessus.
  select we.code, we.libelle
  into v_etape_code, v_etape_libelle
  from public.workflow_instances wi
  join public.workflow_etapes we on we.id = wi.etape_courante_id
  where wi.id = v_workflow_instance_id;

  update public.ged_versements
  set brouillon = false,
      workflow_instance_id = v_workflow_instance_id,
      etape_code = v_etape_code,
      etape_libelle = v_etape_libelle
  where id = p_versement_id
  returning * into v_versement;

  return v_versement;
end;
$$;

grant execute on function public.fn_soumettre_versement(uuid) to authenticated;

-- Workflow (porté par le versement) -----------------------------------------

create or replace function public.fn_transitions_disponibles_versement(p_versement_id uuid)
returns table (
  transition_id uuid,
  code text,
  libelle_action text,
  etape_cible_id uuid,
  etape_cible_libelle text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_versement record;
  v_instance record;
begin
  select * into v_versement from public.ged_versements where id = p_versement_id;
  if not found or v_versement.organisation_id <> app.current_organisation_id() then
    raise exception 'Versement % introuvable ou accès refusé', p_versement_id;
  end if;

  if not (v_versement.redacteur_id = auth.uid() or app.has_permission('ged', 'consulter', v_versement.entite_id)) then
    raise exception 'Versement % introuvable ou accès refusé', p_versement_id;
  end if;

  if v_versement.workflow_instance_id is null then
    return;
  end if;

  select * into v_instance from public.workflow_instances where id = v_versement.workflow_instance_id;

  if v_instance.statut_instance <> 'en_cours' then
    return;
  end if;

  return query
  select wt.id, wt.code, wt.libelle_action, we.id, we.libelle
  from public.workflow_transitions wt
  join public.workflow_etapes we on we.id = wt.etape_cible_id
  where wt.workflow_definition_id = v_instance.workflow_definition_id
    and (wt.etape_source_id = v_instance.etape_courante_id or wt.etape_source_id is null)
    and app.acteur_de_transition_autorise(wt.id, auth.uid(), v_versement.entite_id)
    and app.fn_condition_satisfaite(wt.condition, to_jsonb(v_versement));
end;
$$;

grant execute on function public.fn_transitions_disponibles_versement(uuid) to authenticated;

create or replace function public.fn_executer_transition_versement(
  p_versement_id uuid,
  p_transition_id uuid,
  p_commentaire text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_versement record;
begin
  select * into v_versement from public.ged_versements where id = p_versement_id;
  if not found then
    raise exception 'Versement % introuvable', p_versement_id;
  end if;

  if v_versement.organisation_id <> app.current_organisation_id() then
    raise exception 'Versement % hors de l''organisation courante', p_versement_id;
  end if;

  if v_versement.workflow_instance_id is null then
    raise exception 'Versement % sans instance de workflow', p_versement_id;
  end if;

  perform app.fn_executer_transition(
    v_versement.workflow_instance_id,
    p_transition_id,
    auth.uid(),
    p_commentaire,
    v_versement.entite_id,
    to_jsonb(v_versement)
  );
end;
$$;

grant execute on function public.fn_executer_transition_versement(uuid, uuid, text) to authenticated;

-- Classement (archiviste, étape "Classement documentaire") ------------------
-- Renommage + catégorie définitive + mots-clés d'indexation par document ; le
-- dossier définitif est copié depuis ged_versements.dossier_cible_id (un seul
-- dossier par versement).

create or replace function public.fn_classer_document(
  p_document_id uuid,
  p_titre text default null,
  p_categorie_id uuid default null,
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
      categorie_id = coalesce(p_categorie_id, categorie_id),
      dossier_id = coalesce(v_versement.dossier_cible_id, dossier_id),
      mots_cles = coalesce(p_mots_cles, mots_cles)
  where id = p_document_id
  returning * into v_document;

  return v_document;
end;
$$;

grant execute on function public.fn_classer_document(uuid, text, uuid, text[]) to authenticated;

-- Recherche documentaire (Archives) ------------------------------------------
-- Restreinte aux documents dont le versement a atteint l'étape finale
-- "Archivage" — la recherche porte sur les archives, pas sur les versements
-- encore en cours de traitement.

create or replace function public.fn_rechercher_documents(
  p_texte text default null,
  p_dossier_id uuid default null,
  p_categorie_id uuid default null,
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
    and (p_categorie_id is null or d.categorie_id = p_categorie_id)
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

grant execute on function public.fn_rechercher_documents(text, uuid, uuid, uuid) to authenticated;

-- Traçabilité des accès en lecture -------------------------------------------
-- Seul point d'écriture de ged_consultations (0057 révoque insert/update/delete
-- pour `authenticated`) — un accès non traçable (RLS refusée) lève une
-- exception plutôt que d'écrire silencieusement une ligne invalide.

create or replace function public.fn_consulter_document(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not app.can_view_document(p_document_id) then
    raise exception 'Document % introuvable ou accès refusé', p_document_id;
  end if;

  insert into public.ged_consultations (document_id, utilisateur_id, type_acces)
  values (p_document_id, auth.uid(), 'consultation');
end;
$$;

grant execute on function public.fn_consulter_document(uuid) to authenticated;

create or replace function public.fn_telecharger_document(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not app.can_view_document(p_document_id) then
    raise exception 'Document % introuvable ou accès refusé', p_document_id;
  end if;

  insert into public.ged_consultations (document_id, utilisateur_id, type_acces)
  values (p_document_id, auth.uid(), 'telechargement');
end;
$$;

grant execute on function public.fn_telecharger_document(uuid) to authenticated;

-- Bannette "À traiter" (adaptée au versement) --------------------------------
-- Type de retour changé (setof documents -> setof ged_versements): DROP requis.

drop function if exists public.fn_bannette_ged();

create or replace function public.fn_bannette_ged()
returns setof public.ged_versements
language plpgsql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
begin
  return query
  select v.*
  from public.ged_versements v
  join public.workflow_instances wi on wi.id = v.workflow_instance_id
  where v.supprime_le is null
    and v.organisation_id = app.current_organisation_id()
    and wi.statut_instance = 'en_cours'
    and (v.redacteur_id = auth.uid() or app.has_permission('ged', 'consulter', v.entite_id))
    and exists (
      select 1
      from public.workflow_transitions wt
      where wt.workflow_definition_id = wi.workflow_definition_id
        and (wt.etape_source_id = wi.etape_courante_id or wt.etape_source_id is null)
        and app.acteur_de_transition_autorise(wt.id, auth.uid(), v.entite_id)
        and app.fn_condition_satisfaite(wt.condition, to_jsonb(v))
    );
end;
$$;

grant execute on function public.fn_bannette_ged() to authenticated;
