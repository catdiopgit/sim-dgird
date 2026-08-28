-- GED — Archivage automatique annuel des courriers/projets/missions clôturés
-- (documentation/Archivage Automatique.txt). Ne modifie aucune table des
-- autres modules (courriers/projets/missions/roles/modules/actions) : le
-- suivi archivistique vit entièrement dans ces 2 nouvelles tables, l'état
-- "archivé" d'un élément est déduit d'une ligne archivage_elements plutôt que
-- d'une colonne ajoutée sur la table d'origine.
--
-- Vocabulaire volontairement distinct de documents.date_archivage /
-- ged_versements.etape_code='archivage', qui désignent l'étape finale du
-- workflow de VERSEMENT d'un document (sans rapport avec le cycle annuel ici).
--
-- Permissions : aucune nouvelle ligne dans modules/actions (référentiels
-- globaux partagés par toutes les organisations) — réutilise module 'ged' +
-- actions déjà existantes : consulter (voir le tableau de bord d'archivage),
-- archiver (préparer/détecter), valider (confirmer définitivement). Le rôle
-- "archiviste" (déjà présent dans le seed de démo) n'a qu'à recevoir ces
-- permissions via Administration > Rôles, comme n'importe quel autre rôle.

create table public.archivage_operations (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  date_debut date not null,
  date_fin date not null,
  statut text not null default 'en_preparation' check (statut in ('en_preparation', 'confirmee')),
  nombre_courriers integer not null default 0,
  nombre_projets integer not null default 0,
  nombre_missions integer not null default 0,
  prepare_par uuid references public.utilisateurs(id) on delete set null,
  prepare_le timestamptz not null default now(),
  confirme_par uuid references public.utilisateurs(id) on delete set null,
  confirme_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_archivage_operations_organisation on public.archivage_operations(organisation_id);

create trigger trg_archivage_operations_updated_at
  before update on public.archivage_operations
  for each row execute function app.set_updated_at();

create table public.archivage_elements (
  id uuid primary key default extensions.gen_random_uuid(),
  operation_id uuid not null references public.archivage_operations(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  type_element text not null check (type_element in ('courrier', 'projet', 'mission')),
  element_id uuid not null,
  reference text not null,
  libelle text not null,
  entite_id uuid references public.entites(id) on delete set null,
  date_cloture date not null,
  -- eligible: détecté, sélectionné par défaut, en attente de confirmation.
  -- exclu: décoché par l'archiviste avant confirmation (fn_archivage_definir_selection).
  -- archive: classement confirmé et documents déplacés (état terminal).
  -- anomalie: classement impossible (entité/type manquant) ou erreur de classement.
  etat text not null default 'eligible' check (etat in ('eligible', 'archive', 'anomalie')),
  selectionne boolean not null default true,
  -- Classement proposé, résolu une fois à la préparation (année, type courrier,
  -- entité) : évite de re-joindre valeurs_listes/entites à la confirmation.
  classement jsonb not null default '{}'::jsonb,
  motif_anomalie text,
  dossier_ged_id uuid references public.ged_dossiers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_archivage_elements_operation on public.archivage_elements(operation_id);
create index idx_archivage_elements_organisation on public.archivage_elements(organisation_id);
create index idx_archivage_elements_element on public.archivage_elements(type_element, element_id);

-- Un élément ne peut être marqué archivé qu'une seule fois, même à travers
-- plusieurs opérations (§13 du brief : prévention des doublons).
create unique index uq_archivage_elements_archive on public.archivage_elements(type_element, element_id) where etat = 'archive';

create trigger trg_archivage_elements_updated_at
  before update on public.archivage_elements
  for each row execute function app.set_updated_at();

-- Traçabilité (§11) : réutilise le trigger d'audit générique déjà en place
-- (0013) plutôt qu'un journal dédié — aucun code d'audit sur mesure.
create trigger trg_audit_archivage_operations
  after insert or update or delete on public.archivage_operations
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_archivage_elements
  after insert or update or delete on public.archivage_elements
  for each row execute function app.fn_audit_trigger();

alter table public.archivage_operations enable row level security;
alter table public.archivage_elements enable row level security;

-- Défense en profondeur : seules les fonctions RPC (SECURITY DEFINER)
-- ci-dessous écrivent dans ces tables.
revoke insert, update, delete on public.archivage_operations from authenticated;
revoke insert, update, delete on public.archivage_elements from authenticated;

create policy archivage_operations_select on public.archivage_operations
  for select using (
    organisation_id = app.current_organisation_id()
    and app.has_permission('ged', 'consulter', null)
  );

create policy archivage_elements_select on public.archivage_elements
  for select using (
    organisation_id = app.current_organisation_id()
    and app.has_permission('ged', 'consulter', null)
  );

-- Helper interne : retrouve un dossier GED par son code (unique par
-- organisation) ou le crée. Utilisé uniquement par fn_archivage_confirmer
-- (déjà security definer) : pas de vérification de permission propre ici,
-- le contrôle a lieu une seule fois à l'entrée de l'appelant.
create or replace function app.archivage_get_or_create_dossier(
  p_organisation_id uuid,
  p_parent_id uuid,
  p_entite_id uuid,
  p_code text,
  p_libelle text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.ged_dossiers where organisation_id = p_organisation_id and code = p_code;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.ged_dossiers (organisation_id, entite_id, parent_dossier_id, code, libelle, created_by)
  values (p_organisation_id, p_entite_id, p_parent_id, p_code, p_libelle, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- Compte, sans rien créer, les éléments éligibles pour la période (par
-- défaut l'année civile précédente, §17) — alimente le mini tableau de bord
-- (§16) avant que l'archiviste ne clique sur "Préparer".
create or replace function public.fn_archivage_compter_eligibles(
  p_date_debut date default null,
  p_date_fin date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_date_debut date;
  v_date_fin date;
  v_resultat jsonb;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;
  if not app.has_permission('ged', 'consulter', null) then
    raise exception 'Permission refusée (ged/consulter)';
  end if;

  v_date_debut := coalesce(p_date_debut, make_date(extract(year from current_date)::int - 1, 1, 1));
  v_date_fin := coalesce(p_date_fin, make_date(extract(year from current_date)::int - 1, 12, 31));

  select jsonb_build_object(
    'dateDebut', v_date_debut,
    'dateFin', v_date_fin,
    'courriers', (
      select count(*) from public.courriers c
      join public.workflow_instances wi on wi.id = c.workflow_instance_id
      where c.organisation_id = v_organisation_id
        and c.supprime_le is null
        and wi.statut_instance = 'terminee'
        and wi.termine_le::date between v_date_debut and v_date_fin
        and not exists (
          select 1 from public.archivage_elements ae
          where ae.type_element = 'courrier' and ae.element_id = c.id and ae.etat = 'archive'
        )
    ),
    'projets', (
      select count(*) from public.projets p
      where p.organisation_id = v_organisation_id
        and p.cloture_statut = 'confirmee'
        and p.cloture_confirmee_le::date between v_date_debut and v_date_fin
        and not exists (
          select 1 from public.archivage_elements ae
          where ae.type_element = 'projet' and ae.element_id = p.id and ae.etat = 'archive'
        )
    ),
    'missions', (
      select count(*) from public.missions m
      join public.workflow_instances wi on wi.id = m.workflow_instance_id
      where m.organisation_id = v_organisation_id
        and m.etape_code = 'cloture'
        and wi.termine_le::date between v_date_debut and v_date_fin
        and not exists (
          select 1 from public.archivage_elements ae
          where ae.type_element = 'mission' and ae.element_id = m.id and ae.etat = 'archive'
        )
    ),
    'dejaArchives', (
      select count(*) from public.archivage_elements ae
      where ae.organisation_id = v_organisation_id and ae.etat = 'archive'
    ),
    'derniereOperation', (
      select jsonb_build_object(
        'dateDebut', o.date_debut, 'dateFin', o.date_fin, 'statut', o.statut, 'confirmeLe', o.confirme_le
      )
      from public.archivage_operations o
      where o.organisation_id = v_organisation_id
      order by o.created_at desc
      limit 1
    )
  ) into v_resultat;

  return v_resultat;
end;
$$;

grant execute on function public.fn_archivage_compter_eligibles(date, date) to authenticated;

-- "Préparer l'archivage annuel" (§4) : un seul appel qui détecte tous les
-- éléments éligibles et les enregistre pour revue. Toute opération encore
-- "en_preparation" pour l'organisation est remplacée (cascade sur ses
-- éléments) — chaque clic sur "Préparer" donne un instantané à jour, jamais
-- de doublons de préparation à gérer côté UI.
create or replace function public.fn_archivage_preparer(
  p_date_debut date default null,
  p_date_fin date default null
)
returns public.archivage_operations
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_date_debut date;
  v_date_fin date;
  v_operation public.archivage_operations;
  v_nb_courriers integer := 0;
  v_nb_projets integer := 0;
  v_nb_missions integer := 0;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;
  if not app.has_permission('ged', 'archiver', null) then
    raise exception 'Permission refusée (ged/archiver)';
  end if;

  v_date_debut := coalesce(p_date_debut, make_date(extract(year from current_date)::int - 1, 1, 1));
  v_date_fin := coalesce(p_date_fin, make_date(extract(year from current_date)::int - 1, 12, 31));

  delete from public.archivage_operations
  where organisation_id = v_organisation_id and statut = 'en_preparation';

  insert into public.archivage_operations (organisation_id, date_debut, date_fin, statut, prepare_par)
  values (v_organisation_id, v_date_debut, v_date_fin, 'en_preparation', auth.uid())
  returning * into v_operation;

  insert into public.archivage_elements (
    operation_id, organisation_id, type_element, element_id, reference, libelle,
    entite_id, date_cloture, etat, classement, motif_anomalie
  )
  select
    v_operation.id, v_organisation_id, 'courrier', c.id, c.numero, c.objet,
    c.entite_id, wi.termine_le::date,
    case when c.entite_id is null or c.type_valeur_id is null then 'anomalie' else 'eligible' end,
    jsonb_build_object(
      'annee', extract(year from wi.termine_le)::int,
      'typeCourrierId', c.type_valeur_id,
      'typeCourrierLibelle', vlt.libelle,
      'entiteId', c.entite_id,
      'entiteLibelle', e.libelle
    ),
    case
      when c.entite_id is null then 'Entité non renseignée'
      when c.type_valeur_id is null then 'Type de courrier non renseigné'
      else null
    end
  from public.courriers c
  join public.workflow_instances wi on wi.id = c.workflow_instance_id
  left join public.valeurs_listes vlt on vlt.id = c.type_valeur_id
  left join public.entites e on e.id = c.entite_id
  where c.organisation_id = v_organisation_id
    and c.supprime_le is null
    and wi.statut_instance = 'terminee'
    and wi.termine_le::date between v_date_debut and v_date_fin
    and not exists (
      select 1 from public.archivage_elements ae
      where ae.type_element = 'courrier' and ae.element_id = c.id and ae.etat = 'archive'
    );
  get diagnostics v_nb_courriers = row_count;

  insert into public.archivage_elements (
    operation_id, organisation_id, type_element, element_id, reference, libelle,
    entite_id, date_cloture, etat, classement, motif_anomalie
  )
  select
    v_operation.id, v_organisation_id, 'projet', p.id, p.code, p.nom,
    p.entite_id, p.cloture_confirmee_le::date,
    case when p.entite_id is null then 'anomalie' else 'eligible' end,
    jsonb_build_object('annee', extract(year from p.cloture_confirmee_le)::int, 'entiteId', p.entite_id, 'entiteLibelle', e.libelle),
    case when p.entite_id is null then 'Entité non renseignée' else null end
  from public.projets p
  left join public.entites e on e.id = p.entite_id
  where p.organisation_id = v_organisation_id
    and p.cloture_statut = 'confirmee'
    and p.cloture_confirmee_le::date between v_date_debut and v_date_fin
    and not exists (
      select 1 from public.archivage_elements ae
      where ae.type_element = 'projet' and ae.element_id = p.id and ae.etat = 'archive'
    );
  get diagnostics v_nb_projets = row_count;

  insert into public.archivage_elements (
    operation_id, organisation_id, type_element, element_id, reference, libelle,
    entite_id, date_cloture, etat, classement, motif_anomalie
  )
  select
    v_operation.id, v_organisation_id, 'mission', m.id, m.reference, m.objet,
    m.entite_id, wi.termine_le::date,
    case when m.entite_id is null then 'anomalie' else 'eligible' end,
    jsonb_build_object('annee', extract(year from wi.termine_le)::int, 'entiteId', m.entite_id, 'entiteLibelle', e.libelle),
    case when m.entite_id is null then 'Entité non renseignée' else null end
  from public.missions m
  join public.workflow_instances wi on wi.id = m.workflow_instance_id
  left join public.entites e on e.id = m.entite_id
  where m.organisation_id = v_organisation_id
    and m.etape_code = 'cloture'
    and wi.termine_le::date between v_date_debut and v_date_fin
    and not exists (
      select 1 from public.archivage_elements ae
      where ae.type_element = 'mission' and ae.element_id = m.id and ae.etat = 'archive'
    );
  get diagnostics v_nb_missions = row_count;

  update public.archivage_operations
  set nombre_courriers = v_nb_courriers, nombre_projets = v_nb_projets, nombre_missions = v_nb_missions
  where id = v_operation.id
  returning * into v_operation;

  return v_operation;
end;
$$;

grant execute on function public.fn_archivage_preparer(date, date) to authenticated;

-- Coche/décoche un élément dans l'écran de prévisualisation (§9), tant que
-- l'opération n'est pas encore confirmée.
create or replace function public.fn_archivage_definir_selection(
  p_element_id uuid,
  p_selectionne boolean
)
returns public.archivage_elements
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_element public.archivage_elements;
  v_operation public.archivage_operations;
begin
  select * into v_element from public.archivage_elements where id = p_element_id;
  if not found then
    raise exception 'Élément d''archivage introuvable';
  end if;
  if v_element.organisation_id <> app.current_organisation_id() then
    raise exception 'Élément hors de l''organisation courante';
  end if;
  if not app.has_permission('ged', 'archiver', null) then
    raise exception 'Permission refusée (ged/archiver)';
  end if;

  select * into v_operation from public.archivage_operations where id = v_element.operation_id;
  if v_operation.statut <> 'en_preparation' then
    raise exception 'Cette opération n''est plus modifiable';
  end if;

  update public.archivage_elements
  set selectionne = p_selectionne
  where id = p_element_id
  returning * into v_element;

  return v_element;
end;
$$;

grant execute on function public.fn_archivage_definir_selection(uuid, boolean) to authenticated;

-- "Confirmer l'archivage" (§10) : classe chaque élément sélectionné dans
-- l'arborescence Archives/{Module}/{Année}/... (§6-8), déplace ses documents
-- déjà rattachés (pièces jointes / livrables / justificatifs de décaissement /
-- documents de mission — cf. audit : aucune liaison générique n'existe,
-- seuls ces documents explicitement rattachés sont déplacés), puis marque
-- l'élément "archive". Une erreur sur un élément ne bloque pas les autres
-- (§12) : il est basculé en "anomalie" avec le message d'erreur comme motif.
create or replace function public.fn_archivage_confirmer(p_operation_id uuid)
returns public.archivage_operations
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_operation public.archivage_operations;
  v_element record;
  v_racine_id uuid;
  v_branche_id uuid;
  v_annee_id uuid;
  v_type_id uuid;
  v_entite_id uuid;
  v_leaf_id uuid;
  v_type_courrier_id uuid;
  v_entite_cible uuid;
  v_annee int;
  v_doc1 uuid;
  v_doc2 uuid;
  v_doc3 uuid;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;
  if not app.has_permission('ged', 'valider', null) then
    raise exception 'Permission refusée (ged/valider)';
  end if;

  select * into v_operation from public.archivage_operations where id = p_operation_id and organisation_id = v_organisation_id;
  if not found then
    raise exception 'Opération d''archivage introuvable';
  end if;
  if v_operation.statut <> 'en_preparation' then
    raise exception 'Cette opération n''est plus en préparation';
  end if;

  v_racine_id := app.archivage_get_or_create_dossier(v_organisation_id, null, null, 'archives', 'Archives');

  for v_element in
    select * from public.archivage_elements
    where operation_id = p_operation_id and selectionne and etat = 'eligible'
  loop
    begin
      v_annee := (v_element.classement->>'annee')::int;
      v_entite_cible := (v_element.classement->>'entiteId')::uuid;

      if v_element.type_element = 'courrier' then
        v_type_courrier_id := (v_element.classement->>'typeCourrierId')::uuid;

        v_branche_id := app.archivage_get_or_create_dossier(v_organisation_id, v_racine_id, null, 'archives-courriers', 'Courriers');
        v_annee_id := app.archivage_get_or_create_dossier(v_organisation_id, v_branche_id, null, 'archives-courriers-' || v_annee, v_annee::text);
        v_type_id := app.archivage_get_or_create_dossier(
          v_organisation_id, v_annee_id, null,
          'archives-courriers-' || v_annee || '-type-' || v_type_courrier_id,
          coalesce(v_element.classement->>'typeCourrierLibelle', 'Type inconnu')
        );
        v_entite_id := app.archivage_get_or_create_dossier(
          v_organisation_id, v_type_id, v_entite_cible,
          'archives-courriers-' || v_annee || '-type-' || v_type_courrier_id || '-entite-' || v_entite_cible,
          coalesce(v_element.classement->>'entiteLibelle', 'Entité inconnue')
        );
        v_leaf_id := app.archivage_get_or_create_dossier(
          v_organisation_id, v_entite_id, v_entite_cible,
          'archives-courriers-' || v_annee || '-type-' || v_type_courrier_id || '-entite-' || v_entite_cible || '-courrier-' || v_element.element_id,
          'Courrier ' || v_element.reference
        );

        update public.documents set dossier_id = v_leaf_id
        where id in (
          select document_id from public.courrier_pieces_jointes
          where courrier_id = v_element.element_id and document_id is not null
        );

      elsif v_element.type_element = 'projet' then
        v_branche_id := app.archivage_get_or_create_dossier(v_organisation_id, v_racine_id, null, 'archives-projets', 'Projets');
        v_annee_id := app.archivage_get_or_create_dossier(v_organisation_id, v_branche_id, null, 'archives-projets-' || v_annee, v_annee::text);
        v_entite_id := app.archivage_get_or_create_dossier(
          v_organisation_id, v_annee_id, v_entite_cible,
          'archives-projets-' || v_annee || '-entite-' || v_entite_cible,
          coalesce(v_element.classement->>'entiteLibelle', 'Entité inconnue')
        );
        v_leaf_id := app.archivage_get_or_create_dossier(
          v_organisation_id, v_entite_id, v_entite_cible,
          'archives-projets-' || v_annee || '-entite-' || v_entite_cible || '-projet-' || v_element.element_id,
          v_element.reference || ' — ' || v_element.libelle
        );

        update public.documents set dossier_id = v_leaf_id
        where id in (
          select document_id from public.livrables
          where projet_id = v_element.element_id and document_id is not null
          union
          select justificatif_document_id from public.decaissements
          where projet_id = v_element.element_id and justificatif_document_id is not null
        );

      elsif v_element.type_element = 'mission' then
        v_branche_id := app.archivage_get_or_create_dossier(v_organisation_id, v_racine_id, null, 'archives-missions', 'Missions');
        v_annee_id := app.archivage_get_or_create_dossier(v_organisation_id, v_branche_id, null, 'archives-missions-' || v_annee, v_annee::text);
        v_entite_id := app.archivage_get_or_create_dossier(
          v_organisation_id, v_annee_id, v_entite_cible,
          'archives-missions-' || v_annee || '-entite-' || v_entite_cible,
          coalesce(v_element.classement->>'entiteLibelle', 'Entité inconnue')
        );
        v_leaf_id := app.archivage_get_or_create_dossier(
          v_organisation_id, v_entite_id, v_entite_cible,
          'archives-missions-' || v_annee || '-entite-' || v_entite_cible || '-mission-' || v_element.element_id,
          v_element.reference || ' — ' || v_element.libelle
        );

        select ordre_mission_document_id, compte_rendu_document_id, pv_document_id
          into v_doc1, v_doc2, v_doc3
        from public.missions where id = v_element.element_id;

        update public.documents set dossier_id = v_leaf_id
        where id in (v_doc1, v_doc2, v_doc3);
      end if;

      update public.archivage_elements
      set etat = 'archive', dossier_ged_id = v_leaf_id
      where id = v_element.id;

    exception when others then
      update public.archivage_elements
      set etat = 'anomalie', motif_anomalie = sqlerrm
      where id = v_element.id;
    end;
  end loop;

  update public.archivage_operations
  set statut = 'confirmee', confirme_par = auth.uid(), confirme_le = now()
  where id = p_operation_id
  returning * into v_operation;

  return v_operation;
end;
$$;

grant execute on function public.fn_archivage_confirmer(uuid) to authenticated;
