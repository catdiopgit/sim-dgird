-- Projets V2 (2/3 — fonctions) : centralisation des droits d'écriture,
-- visibilité étendue, workflow de clôture à 2 niveaux, clôture de livrable
-- gardée par la présence d'un justificatif, espace documentaire, historique.
-- Patron repris de app.can_view_projet/app.has_permission (0004/0016) et des
-- RPC SECURITY DEFINER existantes (fn_ajouter_decharge_courrier,
-- fn_deverrouiller_courrier en 0047, fn_imputer_courrier en 0034).

-- §4 Centralise "qui peut modifier ce projet et ses objets rattachés" :
-- responsable, permission projets/modifier, ou membre actif "contributeur"
-- (peut_modifier). Un projet dont la clôture est confirmée devient lecture
-- seule pour tout le monde (§8 étape 4) — un seul endroit à changer pour ça.
create or replace function app.can_modifier_projet(p_projet_id uuid)
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

  if v_projet.cloture_statut = 'confirmee' then
    return false;
  end if;

  if v_projet.responsable_id = auth.uid() or app.has_permission('projets', 'modifier', v_projet.entite_id) then
    return true;
  end if;

  return exists (
    select 1 from public.projet_membres pm
    where pm.projet_id = p_projet_id
      and pm.utilisateur_id = auth.uid()
      and pm.date_retrait is null
      and pm.peut_modifier
  );
end;
$$;

-- §5 Visibilité : les accès "privilégiés" (responsable/sponsor/coordonnateur/
-- permission consulter/membre actif) priment toujours sur la portée choisie.
-- Au-delà, la portée tranche : 'membres' n'ajoute rien (déjà couvert
-- ci-dessus), 'entites'/'agents' se résolvent via les tables de sélection,
-- 'tous' ouvre à tout utilisateur de l'organisation. Remplace l'ancien accès
-- implicite "même entité que le projet" — devenu explicite via l'option
-- 'entites', pour respecter l'exclusivité de l'option 'membres' du cahier
-- des charges (§5, option 1 : "seuls les membres du projet").
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
    or v_projet.sponsor_id = auth.uid()
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

-- §6 Un document rattaché à un projet (directement ou via un livrable/
-- avenant) hérite de la visibilité du projet, en plus des voies d'accès GED
-- existantes (créateur, permission ged/consulter, droits explicites).
create or replace function app.can_view_document(p_document_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc record;
  v_result boolean;
begin
  select * into v_doc from public.documents where id = p_document_id;
  if not found then
    return false;
  end if;

  if v_doc.organisation_id <> app.current_organisation_id() then
    return false;
  end if;

  if v_doc.created_by = auth.uid() or app.has_permission('ged', 'consulter', v_doc.entite_id) then
    return true;
  end if;

  if v_doc.projet_id is not null and app.can_view_projet(v_doc.projet_id) then
    return true;
  end if;

  select true into v_result
  from public.document_droits dd
  left join public.utilisateur_roles ur on ur.role_id = dd.role_id and ur.utilisateur_id = auth.uid()
  where dd.document_id = p_document_id
    and dd.action_id = (select id from public.actions where code = 'consulter')
    and (dd.utilisateur_id = auth.uid() or dd.entite_id = app.current_entite_id() or ur.utilisateur_id is not null)
  limit 1;

  if coalesce(v_result, false) then
    return true;
  end if;

  if v_doc.dossier_id is not null then
    select true into v_result
    from public.dossier_droits dr
    left join public.utilisateur_roles ur on ur.role_id = dr.role_id and ur.utilisateur_id = auth.uid()
    where dr.dossier_id = v_doc.dossier_id
      and dr.action_id = (select id from public.actions where code = 'consulter')
      and (dr.utilisateur_id = auth.uid() or dr.entite_id = app.current_entite_id() or ur.utilisateur_id is not null)
    limit 1;
  end if;

  return coalesce(v_result, false);
end;
$$;

-- §8 étape 3 : remonte l'arbre des entités (parent_entite_id) depuis
-- l'entité porteuse pour savoir si l'utilisateur est responsable de cette
-- entité ou d'une de ses entités ancêtres.
create or replace function app.fn_est_responsable_hierarchique(p_entite_id uuid, p_utilisateur_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_courant uuid := p_entite_id;
  v_responsable uuid;
  v_parent uuid;
begin
  while v_courant is not null loop
    select responsable_utilisateur_id, parent_entite_id into v_responsable, v_parent
    from public.entites where id = v_courant;

    if v_responsable = p_utilisateur_id then
      return true;
    end if;

    v_courant := v_parent;
  end loop;

  return false;
end;
$$;

-- §9 Contrôles avant clôture, en lecture seule — réutilisée par la checklist
-- de l'UI (onglet Clôture) et par fn_demander_cloture_projet ci-dessous.
-- Les avenants/documents contractuels sont remontés à titre informatif
-- (bloquant = false) : le cahier des charges ne fixe pas de type de document
-- contractuel obligatoire par nature de projet, seule l'absence de
-- justificatif sur un livrable réalisé est structurellement bloquante (§3/§9).
create or replace function app.fn_verifier_cloture_projet(p_projet_id uuid)
returns table (bloquant boolean, code text, message text)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_projet public.projets;
  v_nb_incomplets integer;
  v_nb_sans_justificatif integer;
  v_nb_avenants integer;
  v_types_contractuels text;
begin
  select * into v_projet from public.projets where id = p_projet_id;
  if not found then
    raise exception 'Projet % introuvable', p_projet_id;
  end if;

  if not app.can_view_projet(p_projet_id) then
    raise exception 'Permission refusée sur le projet %', p_projet_id;
  end if;

  return query select
    v_projet.responsable_id is null,
    'responsable'::text,
    case when v_projet.responsable_id is null
      then 'Le projet n''a pas de responsable désigné.'
      else 'Responsable désigné.' end;

  -- entite_id est NOT NULL en base : contrôle toujours vérifié, gardé pour
  -- affichage explicite de la règle dans la checklist (§9).
  return query select false, 'entite'::text, 'Entité porteuse définie.'::text;

  select count(*) into v_nb_incomplets
  from public.livrables l
  join public.activites a on a.id = l.activite_id
  join public.phases ph on ph.id = a.phase_id
  left join public.valeurs_listes vl on vl.id = l.statut_valeur_id
  where ph.projet_id = p_projet_id
    and coalesce(vl.code, '') not in ('realise', 'valide', 'annule');

  return query select
    v_nb_incomplets > 0,
    'livrables_incomplets'::text,
    case when v_nb_incomplets > 0
      then format('%s livrable(s) à venir, en cours ou en retard.', v_nb_incomplets)
      else 'Tous les livrables sont réalisés, validés ou annulés.' end;

  select count(*) into v_nb_sans_justificatif
  from public.livrables l
  join public.activites a on a.id = l.activite_id
  join public.phases ph on ph.id = a.phase_id
  join public.valeurs_listes vl on vl.id = l.statut_valeur_id
  where ph.projet_id = p_projet_id
    and vl.code in ('realise', 'valide')
    and not exists (select 1 from public.documents d where d.livrable_id = l.id and d.supprime_le is null);

  return query select
    v_nb_sans_justificatif > 0,
    'livrables_sans_justificatif'::text,
    case when v_nb_sans_justificatif > 0
      then format('%s livrable(s) réalisé(s) sans document justificatif.', v_nb_sans_justificatif)
      else 'Tous les livrables réalisés disposent d''un justificatif.' end;

  select count(*) into v_nb_avenants from public.avenants where projet_id = p_projet_id;
  return query select false, 'avenants'::text, format('%s avenant(s) enregistré(s).', v_nb_avenants);

  select string_agg(vl.libelle, ', ') into v_types_contractuels
  from public.documents d
  join public.valeurs_listes vl on vl.id = d.type_projet_valeur_id
  where d.projet_id = p_projet_id and d.supprime_le is null
    and vl.code in ('tdr', 'contrat', 'ordre-service');

  return query select
    false,
    'documents_contractuels'::text,
    case when v_types_contractuels is null
      then 'Aucun document contractuel (TDR / contrat / ordre de service) déposé — à vérifier.'
      else format('Documents contractuels présents : %s.', v_types_contractuels) end;
end;
$$;

create or replace function public.fn_verifier_cloture_projet(p_projet_id uuid)
returns table (bloquant boolean, code text, message text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from app.fn_verifier_cloture_projet(p_projet_id);
$$;

grant execute on function public.fn_verifier_cloture_projet(uuid) to authenticated;

-- §8 étape 2 : réservé au responsable du projet (règle fixe du cahier des
-- charges, pas une permission de rôle). Échoue si un contrôle bloquant de
-- fn_verifier_cloture_projet subsiste.
create or replace function public.fn_demander_cloture_projet(p_projet_id uuid)
returns public.projets
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_projet public.projets;
  v_action_id uuid;
  v_blocages text;
begin
  select * into v_projet from public.projets where id = p_projet_id;
  if not found then
    raise exception 'Projet % introuvable', p_projet_id;
  end if;

  if v_projet.organisation_id <> app.current_organisation_id() then
    raise exception 'Projet % hors de l''organisation courante', p_projet_id;
  end if;

  if v_projet.responsable_id is distinct from auth.uid() then
    raise exception 'Seul le responsable du projet peut demander sa clôture';
  end if;

  if v_projet.cloture_statut = 'confirmee' then
    raise exception 'Le projet % est déjà clôturé', p_projet_id;
  end if;

  if v_projet.cloture_statut = 'demandee' then
    raise exception 'Une demande de clôture est déjà en attente de confirmation';
  end if;

  select string_agg(message, ' | ') into v_blocages
  from app.fn_verifier_cloture_projet(p_projet_id)
  where bloquant;

  if v_blocages is not null then
    raise exception 'Clôture impossible : %', v_blocages;
  end if;

  update public.projets
  set cloture_statut = 'demandee',
      cloture_demandee_par = auth.uid(),
      cloture_demandee_le = now(),
      cloture_motif_rejet = null
  where id = p_projet_id
  returning * into v_projet;

  select id into v_action_id from public.actions where code = 'demander_cloture';
  insert into public.journal_audit (utilisateur_id, organisation_id, action_id, objet_type, objet_id, nouvelle_valeur)
  values (auth.uid(), v_projet.organisation_id, v_action_id, 'projets', p_projet_id, jsonb_build_object('cloture_statut', 'demandee'));

  return v_projet;
end;
$$;

grant execute on function public.fn_demander_cloture_projet(uuid) to authenticated;

-- §8 étape 3 : réservé au responsable de l'entité porteuse, à un de ses
-- supérieurs hiérarchiques (app.fn_est_responsable_hierarchique), ou à un
-- rôle disposant de projets/valider sur cette entité (déjà seedé pour
-- directeur/directeur-general/validateur/administrateur — 01_seed.sql).
create or replace function public.fn_confirmer_cloture_projet(p_projet_id uuid, p_commentaire text default null)
returns public.projets
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_projet public.projets;
  v_action_id uuid;
  v_statut_termine_id uuid;
begin
  select * into v_projet from public.projets where id = p_projet_id;
  if not found then
    raise exception 'Projet % introuvable', p_projet_id;
  end if;

  if v_projet.organisation_id <> app.current_organisation_id() then
    raise exception 'Projet % hors de l''organisation courante', p_projet_id;
  end if;

  if v_projet.cloture_statut <> 'demandee' then
    raise exception 'Aucune demande de clôture en attente pour ce projet';
  end if;

  if not (
    app.fn_est_responsable_hierarchique(v_projet.entite_id, auth.uid())
    or app.has_permission('projets', 'valider', v_projet.entite_id)
  ) then
    raise exception 'Seul le responsable de l''entité porteuse (ou un supérieur hiérarchique) peut confirmer la clôture';
  end if;

  select vl.id into v_statut_termine_id
  from public.valeurs_listes vl
  join public.listes_valeurs l on l.id = vl.liste_id
  where l.organisation_id = v_projet.organisation_id and l.code = 'projet_statut' and vl.code = 'termine';

  update public.projets
  set cloture_statut = 'confirmee',
      cloture_confirmee_par = auth.uid(),
      cloture_confirmee_le = now(),
      date_fin_reelle = coalesce(date_fin_reelle, current_date),
      statut_valeur_id = coalesce(v_statut_termine_id, statut_valeur_id)
  where id = p_projet_id
  returning * into v_projet;

  select id into v_action_id from public.actions where code = 'confirmer_cloture';
  insert into public.journal_audit (utilisateur_id, organisation_id, action_id, objet_type, objet_id, nouvelle_valeur)
  values (auth.uid(), v_projet.organisation_id, v_action_id, 'projets', p_projet_id, jsonb_build_object('commentaire', p_commentaire));

  return v_projet;
end;
$$;

grant execute on function public.fn_confirmer_cloture_projet(uuid, text) to authenticated;

create or replace function public.fn_rejeter_cloture_projet(p_projet_id uuid, p_motif text)
returns public.projets
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_projet public.projets;
  v_action_id uuid;
begin
  if p_motif is null or btrim(p_motif) = '' then
    raise exception 'Un motif est obligatoire pour rejeter une demande de clôture';
  end if;

  select * into v_projet from public.projets where id = p_projet_id;
  if not found then
    raise exception 'Projet % introuvable', p_projet_id;
  end if;

  if v_projet.organisation_id <> app.current_organisation_id() then
    raise exception 'Projet % hors de l''organisation courante', p_projet_id;
  end if;

  if v_projet.cloture_statut <> 'demandee' then
    raise exception 'Aucune demande de clôture en attente pour ce projet';
  end if;

  if not (
    app.fn_est_responsable_hierarchique(v_projet.entite_id, auth.uid())
    or app.has_permission('projets', 'valider', v_projet.entite_id)
  ) then
    raise exception 'Seul le responsable de l''entité porteuse (ou un supérieur hiérarchique) peut rejeter la clôture';
  end if;

  update public.projets
  set cloture_statut = 'rejetee',
      cloture_motif_rejet = p_motif,
      cloture_confirmee_par = null,
      cloture_confirmee_le = null
  where id = p_projet_id
  returning * into v_projet;

  select id into v_action_id from public.actions where code = 'rejeter_cloture';
  insert into public.journal_audit (utilisateur_id, organisation_id, action_id, objet_type, objet_id, nouvelle_valeur)
  values (auth.uid(), v_projet.organisation_id, v_action_id, 'projets', p_projet_id, jsonb_build_object('motif', p_motif));

  return v_projet;
end;
$$;

grant execute on function public.fn_rejeter_cloture_projet(uuid, text) to authenticated;

-- §3 Règle obligatoire : un livrable ne peut passer "réalisé"/"validé" que
-- s'il a au moins un document justificatif associé. Le frontend n'expose ces
-- deux statuts que via cette RPC (jamais via un simple update du champ
-- statut_valeur_id) — même garantie applicative que fn_ajouter_decharge_courrier.
create or replace function public.fn_cloturer_livrable(p_livrable_id uuid, p_statut_code text default 'realise')
returns public.livrables
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_livrable public.livrables;
  v_projet_id uuid;
  v_organisation_id uuid;
  v_statut_id uuid;
  v_nb_documents integer;
begin
  if p_statut_code not in ('realise', 'valide') then
    raise exception 'Statut de clôture invalide : %', p_statut_code;
  end if;

  select * into v_livrable from public.livrables where id = p_livrable_id;
  if not found then
    raise exception 'Livrable % introuvable', p_livrable_id;
  end if;

  select p.id, p.organisation_id into v_projet_id, v_organisation_id
  from public.activites a
  join public.phases ph on ph.id = a.phase_id
  join public.projets p on p.id = ph.projet_id
  where a.id = v_livrable.activite_id;

  if not app.can_modifier_projet(v_projet_id) then
    raise exception 'Permission refusée sur le livrable %', p_livrable_id;
  end if;

  select count(*) into v_nb_documents
  from public.documents d
  where d.livrable_id = p_livrable_id and d.supprime_le is null;

  if v_nb_documents = 0 then
    raise exception 'Impossible de clôturer le livrable : aucun document justificatif associé';
  end if;

  select vl.id into v_statut_id
  from public.valeurs_listes vl
  join public.listes_valeurs l on l.id = vl.liste_id
  where l.organisation_id = v_organisation_id and l.code = 'livrable_statut' and vl.code = p_statut_code;

  update public.livrables
  set statut_valeur_id = v_statut_id,
      date_remise = coalesce(date_remise, current_date),
      avancement_pct = 100
  where id = p_livrable_id
  returning * into v_livrable;

  return v_livrable;
end;
$$;

grant execute on function public.fn_cloturer_livrable(uuid, text) to authenticated;

-- §12 Tableau de suivi transverse (toutes phases/activités confondues) pour
-- l'onglet Livrables — évite de dépendre du filtrage PostgREST sur une
-- ressource imbriquée à deux niveaux (livrables -> activites -> phases) côté
-- client, non garanti selon les versions.
create or replace function public.fn_livrables_projet(p_projet_id uuid)
returns table (
  id uuid,
  activite_id uuid,
  nom text,
  description text,
  responsable_id uuid,
  date_prevue date,
  date_remise date,
  statut_valeur_id uuid,
  avancement_pct numeric,
  document_id uuid,
  workflow_instance_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  phase_id uuid,
  phase_nom text,
  activite_nom text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    l.id, l.activite_id, l.nom, l.description, l.responsable_id, l.date_prevue, l.date_remise,
    l.statut_valeur_id, l.avancement_pct, l.document_id, l.workflow_instance_id, l.created_at, l.updated_at,
    ph.id as phase_id, ph.nom as phase_nom, a.nom as activite_nom
  from public.livrables l
  join public.activites a on a.id = l.activite_id
  join public.phases ph on ph.id = a.phase_id
  where ph.projet_id = p_projet_id
    and app.can_view_projet(p_projet_id)
  order by l.date_prevue nulls last, l.created_at;
$$;

grant execute on function public.fn_livrables_projet(uuid) to authenticated;

-- §6 Dépôt d'un document dans l'espace documentaire du projet (ou rattaché à
-- un livrable/avenant précis). Bypasse la permission GED classique (ged/
-- creer) : un contributeur projet doit pouvoir déposer les pièces de son
-- projet sans droit GED. Deuxième étape (upload du fichier) : réutiliser
-- fn_verser_version_document (0056), inchangée — son contrôle
-- `created_by = auth.uid()` passe puisque ce document vient d'être créé par
-- l'appelant.
create or replace function public.fn_ajouter_document_projet(
  p_projet_id uuid,
  p_titre text,
  p_description text default null,
  p_type_projet_valeur_id uuid default null,
  p_livrable_id uuid default null,
  p_avenant_id uuid default null
)
returns public.documents
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_projet public.projets;
  v_document public.documents;
begin
  select * into v_projet from public.projets where id = p_projet_id;
  if not found then
    raise exception 'Projet % introuvable', p_projet_id;
  end if;

  if not app.can_modifier_projet(p_projet_id) then
    raise exception 'Permission refusée sur le projet %', p_projet_id;
  end if;

  if p_livrable_id is not null and not exists (
    select 1 from public.livrables l
    join public.activites a on a.id = l.activite_id
    join public.phases ph on ph.id = a.phase_id
    where l.id = p_livrable_id and ph.projet_id = p_projet_id
  ) then
    raise exception 'Livrable % n''appartient pas au projet %', p_livrable_id, p_projet_id;
  end if;

  if p_avenant_id is not null and not exists (
    select 1 from public.avenants where id = p_avenant_id and projet_id = p_projet_id
  ) then
    raise exception 'Avenant % n''appartient pas au projet %', p_avenant_id, p_projet_id;
  end if;

  insert into public.documents (
    organisation_id, projet_id, livrable_id, avenant_id, entite_id,
    titre, description, type_projet_valeur_id, created_by
  ) values (
    v_projet.organisation_id, p_projet_id, p_livrable_id, p_avenant_id, v_projet.entite_id,
    p_titre, p_description, p_type_projet_valeur_id, auth.uid()
  )
  returning * into v_document;

  return v_document;
end;
$$;

grant execute on function public.fn_ajouter_document_projet(uuid, text, text, uuid, uuid, uuid) to authenticated;

-- §10 Historique : agrège journal_audit sur tout le graphe d'objets du
-- projet (les triggers d'audit génériques sont câblés objet par objet, pas
-- par projet — cette RPC fait l'union pour l'onglet Historique de l'UI).
create or replace function public.fn_historique_projet(p_projet_id uuid)
returns setof public.journal_audit
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not app.can_view_projet(p_projet_id) then
    raise exception 'Permission refusée sur le projet %', p_projet_id;
  end if;

  return query
  select ja.*
  from public.journal_audit ja
  where (ja.objet_type = 'projets' and ja.objet_id = p_projet_id)
     or (ja.objet_type = 'phases' and ja.objet_id in (
           select id from public.phases where projet_id = p_projet_id
         ))
     or (ja.objet_type = 'activites' and ja.objet_id in (
           select a.id from public.activites a
           join public.phases ph on ph.id = a.phase_id
           where ph.projet_id = p_projet_id
         ))
     or (ja.objet_type = 'taches' and ja.objet_id in (
           select t.id from public.taches t
           join public.activites a on a.id = t.activite_id
           join public.phases ph on ph.id = a.phase_id
           where ph.projet_id = p_projet_id
         ))
     or (ja.objet_type = 'livrables' and ja.objet_id in (
           select l.id from public.livrables l
           join public.activites a on a.id = l.activite_id
           join public.phases ph on ph.id = a.phase_id
           where ph.projet_id = p_projet_id
         ))
     or (ja.objet_type = 'projet_membres' and ja.objet_id in (
           select id from public.projet_membres where projet_id = p_projet_id
         ))
     or (ja.objet_type = 'avenants' and ja.objet_id in (
           select id from public.avenants where projet_id = p_projet_id
         ))
     or (ja.objet_type = 'documents' and ja.objet_id in (
           select id from public.documents where projet_id = p_projet_id
         ))
  order by ja.created_at desc;
end;
$$;

grant execute on function public.fn_historique_projet(uuid) to authenticated;
