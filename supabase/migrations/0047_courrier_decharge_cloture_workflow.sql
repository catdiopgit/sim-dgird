-- Courrier de départ + décharge = dossier clos : jusqu'ici fn_ajouter_decharge_courrier
-- verrouillait le courrier (écriture) sans jamais toucher à son
-- workflow_instances, qui restait "en_cours" indéfiniment. On termine
-- désormais explicitement l'instance à l'ajout de la décharge (réservé aux
-- courriers sortants, garde côté serveur comme le reste du module), et on
-- symétrise en réveillant l'instance au déverrouillage exceptionnel — sinon
-- déverrouiller débloque l'écriture mais laisse un workflow bloqué en
-- "terminee" sans transition possible.
--
-- fn_bannettes_courrier('archives') filtrait sur we.type_etape = 'finale'
-- (étape courante), ce qui rendait un courrier clos par décharge invisible de
-- toute bannette (ni "a_traiter" — statut_instance déjà exclu par le filtre
-- 'en_cours' — ni "archives", faute d'étape finale). statut_instance =
-- 'terminee' est en réalité le signal fiable de "fini" (fn_executer_transition
-- le pose déjà quand l'étape cible est finale/rejet) : on l'ajoute à la
-- clause "archives" plutôt que de dépendre uniquement du type d'étape.
--
-- La bannette "sortants" ne filtre que sur c.sens = 'sortant' (0042) : un
-- courrier départ déchargé y reste visible sans aucun changement requis.

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
      and statut_instance = 'en_cours';
  end if;

  return v_courrier;
end;
$$;

create or replace function public.fn_deverrouiller_courrier(
  p_courrier_id uuid,
  p_motif text
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_courrier record;
  v_action_id uuid;
begin
  if p_motif is null or btrim(p_motif) = '' then
    raise exception 'Un motif est obligatoire pour déverrouiller un courrier';
  end if;

  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  if not app.has_permission('courrier', 'deverrouiller', v_courrier.entite_id) then
    raise exception 'Permission refusée (courrier/deverrouiller)';
  end if;

  select id into v_action_id from public.actions where code = 'deverrouiller';

  insert into public.journal_audit (
    utilisateur_id, organisation_id, action_id, objet_type, objet_id, ancienne_valeur, nouvelle_valeur
  ) values (
    auth.uid(), v_courrier.organisation_id, v_action_id, 'courriers', p_courrier_id,
    jsonb_build_object('verrouille_le', v_courrier.verrouille_le, 'verrouille_par', v_courrier.verrouille_par),
    jsonb_build_object('motif', p_motif)
  );

  update public.courriers
  set verrouille_le = null, verrouille_par = null
  where id = p_courrier_id
  returning * into v_courrier;

  if v_courrier.workflow_instance_id is not null then
    update public.workflow_instances
    set statut_instance = 'en_cours', termine_le = null
    where id = v_courrier.workflow_instance_id
      and statut_instance = 'terminee';
  end if;

  return v_courrier;
end;
$$;

create or replace function public.fn_bannettes_courrier(p_bannette text)
returns setof public.courriers
language plpgsql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
begin
  if p_bannette = 'a_traiter' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and wi.statut_instance = 'en_cours'
      and app.can_view_courrier(c.id)
      and exists (
        select 1
        from public.workflow_transitions wt
        where wt.workflow_definition_id = wi.workflow_definition_id
          and (wt.etape_source_id = wi.etape_courante_id or wt.etape_source_id is null)
          and app.acteur_de_transition_autorise(wt.id, auth.uid(), c.entite_id)
          and app.fn_condition_satisfaite(wt.condition, to_jsonb(c))
      );

  elsif p_bannette = 'en_retard' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and wi.statut_instance = 'en_cours'
      and (
        (we.delai_jours is not null and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now())
        or exists (
          select 1 from public.courrier_destinataires cd
          where cd.courrier_id = c.id
            and cd.type_diffusion = 'principal'
            and cd.echeance is not null
            and cd.echeance < current_date
        )
      )
      and app.can_view_courrier(c.id);

  elsif p_bannette = 'archives' then
    return query
    select c.*
    from public.courriers c
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and (we.type_etape = 'finale' or wi.statut_instance = 'terminee')
      and app.can_view_courrier(c.id);

  elsif p_bannette = 'sortants' then
    return query
    select c.*
    from public.courriers c
    where c.supprime_le is null
      and c.organisation_id = app.current_organisation_id()
      and c.sens = 'sortant'
      and app.can_view_courrier(c.id);

  else
    raise exception 'Bannette % inconnue', p_bannette;
  end if;
end;
$$;
