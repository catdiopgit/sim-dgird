-- GED V2: refonte fonctionnelle (documentation/GED V2  Refonte fonctionnelle.txt).
-- Le workflow porte désormais sur une DEMANDE DE VERSEMENT (lot de documents),
-- pas sur chaque document individuellement : un agent constitue un brouillon
-- (plusieurs documents), le soumet, l'archiviste accuse réception, contrôle,
-- peut demander une correction (retour brouillon), valide, classe puis archive.

create table public.ged_versements (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  entite_id uuid references public.entites(id) on delete set null,
  -- Un versement cible toujours un seul dossier de classement (proposé par
  -- l'agent, confirmable par l'archiviste au Classement).
  dossier_cible_id uuid references public.ged_dossiers(id) on delete set null,
  objet text not null,
  description text,
  brouillon boolean not null default true,
  workflow_instance_id uuid references public.workflow_instances(id) on delete set null,
  etape_code text,
  etape_libelle text,
  redacteur_id uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  supprime_le timestamptz
);

create index idx_ged_versements_organisation on public.ged_versements(organisation_id);
create index idx_ged_versements_workflow_instance on public.ged_versements(workflow_instance_id);
create index idx_ged_versements_redacteur on public.ged_versements(redacteur_id);

create trigger trg_ged_versements_updated_at
  before update on public.ged_versements
  for each row execute function app.set_updated_at();

create trigger trg_audit_ged_versements
  after insert or update or delete on public.ged_versements
  for each row execute function app.fn_audit_trigger();

-- Mots-clés d'indexation (vocabulaire libre pour cette itération, cf. §11 du
-- plan de refonte) : simple tableau, pas de référentiel séparé.
alter table public.documents add column mots_cles text[] not null default '{}'::text[];

-- Rattachement document -> versement. Bootstrap: réutilise l'id du document
-- comme id du versement rétroactif (corrélation 1:1 triviale, propre à cette
-- migration ponctuelle — les nouveaux versements auront leur propre id).
alter table public.documents add column versement_id uuid references public.ged_versements(id) on delete cascade;

insert into public.ged_versements (
  id, organisation_id, entite_id, dossier_cible_id, objet, description,
  brouillon, workflow_instance_id, etape_code, etape_libelle, redacteur_id,
  created_at, updated_at, supprime_le
)
select
  d.id,
  d.organisation_id, d.entite_id, d.dossier_id, d.titre, d.description,
  (d.workflow_instance_id is null), d.workflow_instance_id, d.etape_code, d.etape_libelle, d.created_by,
  d.created_at, d.updated_at, d.supprime_le
from public.documents d;

update public.documents d
set versement_id = d.id
where versement_id is null;

alter table public.documents alter column versement_id set not null;
create index idx_documents_versement on public.documents(versement_id);

-- Les policies génériques workflow_instances_select/workflow_historique_select
-- (0014) vérifient la visibilité via documents.workflow_instance_id — à
-- reponter sur ged_versements.workflow_instance_id avant de pouvoir retirer
-- cette colonne de documents.
drop policy workflow_instances_select on public.workflow_instances;

create policy workflow_instances_select on public.workflow_instances
  for select using (
    exists (select 1 from public.courriers c where c.workflow_instance_id = workflow_instances.id and c.organisation_id = app.current_organisation_id())
    or exists (select 1 from public.ged_versements v where v.workflow_instance_id = workflow_instances.id and v.organisation_id = app.current_organisation_id())
    or exists (select 1 from public.missions m where m.workflow_instance_id = workflow_instances.id and m.organisation_id = app.current_organisation_id())
  );

drop policy workflow_historique_select on public.workflow_historique;

create policy workflow_historique_select on public.workflow_historique
  for select using (
    exists (
      select 1 from public.workflow_instances wi
      where wi.id = workflow_historique.workflow_instance_id
        and (
          exists (select 1 from public.courriers c where c.workflow_instance_id = wi.id and c.organisation_id = app.current_organisation_id())
          or exists (select 1 from public.ged_versements v where v.workflow_instance_id = wi.id and v.organisation_id = app.current_organisation_id())
          or exists (select 1 from public.missions m where m.workflow_instance_id = wi.id and m.organisation_id = app.current_organisation_id())
        )
    )
  );

-- Le workflow vit désormais sur ged_versements: retrait des colonnes
-- redondantes sur documents (leur contenu a été copié ci-dessus).
alter table public.documents
  drop column workflow_instance_id,
  drop column etape_code,
  drop column etape_libelle;

-- app.sync_etape_cache (0011): remplace la branche `documents` par une branche
-- `ged_versements`, avec un effet de bord attendu du nouveau workflow — une
-- transition qui mène à une étape de type 'rejet' (ex. "À corriger") renvoie
-- le versement en brouillon modifiable plutôt que de le clore définitivement.
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

  update public.missions
  set etape_code = v_code, etape_libelle = v_libelle
  where workflow_instance_id = new.workflow_instance_id;

  return new;
end;
$$;

-- Restructuration du workflow ged-standard (seed) : ajout de l'étape
-- "Réception", et la correction devient une boucle depuis "Contrôle" plutôt
-- qu'un aller simple depuis "Validation".

-- 1. Étape initiale renommée Dépôt -> Soumission.
update public.workflow_etapes we
set code = 'soumission', libelle = 'Soumission'
from public.workflow_definitions wd
where wd.id = we.workflow_definition_id
  and wd.code = 'ged-standard'
  and we.code = 'depot';

-- 2. Décale l'ordre des étapes suivantes pour insérer "Réception" en position 2.
update public.workflow_etapes we
set ordre = ordre + 1
from public.workflow_definitions wd
where wd.id = we.workflow_definition_id
  and wd.code = 'ged-standard'
  and we.code in ('controle', 'validation', 'classement', 'archivage');

insert into public.workflow_etapes (workflow_definition_id, code, libelle, ordre, type_etape)
select wd.id, 'reception', 'Réception', 2, 'intermediaire'::public.type_etape_workflow
from public.workflow_definitions wd
where wd.code = 'ged-standard'
on conflict (workflow_definition_id, code) do nothing;

-- 3. Étape de rejet renommée Rejeté -> À corriger (reste type_etape='rejet':
-- réutilise sans changement le comportement existant de app.fn_executer_transition
-- qui clôt l'instance de workflow en atteignant une étape 'finale'/'rejet').
update public.workflow_etapes we
set code = 'a_corriger', libelle = 'À corriger'
from public.workflow_definitions wd
where wd.id = we.workflow_definition_id
  and wd.code = 'ged-standard'
  and we.code = 'rejete';

-- 4. Nouvelle transition Soumission -> Réception.
insert into public.workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
select wd.id, src.id, tgt.id, 'recevoir', 'Accuser réception'
from public.workflow_definitions wd
join public.workflow_etapes src on src.workflow_definition_id = wd.id and src.code = 'soumission'
join public.workflow_etapes tgt on tgt.workflow_definition_id = wd.id and tgt.code = 'reception'
where wd.code = 'ged-standard'
on conflict (workflow_definition_id, code) do nothing;

-- 5. "Contrôler" part désormais de Réception (et non plus de Soumission).
update public.workflow_transitions wt
set etape_source_id = src.id
from public.workflow_definitions wd
join public.workflow_etapes src on src.workflow_definition_id = wd.id and src.code = 'reception'
where wt.workflow_definition_id = wd.id
  and wd.code = 'ged-standard'
  and wt.code = 'controler';

-- 6. Ancienne transition "rejeter" (Contrôle -> À corriger) supprimée: son rôle
-- est repris par "demander-correction" reponté depuis Contrôle (étape 7) —
-- une seule branche corrective, conforme au schéma cible validé.
delete from public.workflow_transitions wt
using public.workflow_definitions wd
where wt.workflow_definition_id = wd.id
  and wd.code = 'ged-standard'
  and wt.code = 'rejeter';

-- 7. "Demander une correction" part désormais de Contrôle (et non plus de
-- Validation) — conserve le même transition_id, donc les mêmes
-- workflow_transition_roles (archiviste/administrateur).
update public.workflow_transitions wt
set etape_source_id = src.id
from public.workflow_definitions wd
join public.workflow_etapes src on src.workflow_definition_id = wd.id and src.code = 'controle'
where wt.workflow_definition_id = wd.id
  and wd.code = 'ged-standard'
  and wt.code = 'demander-correction';

-- 8. "Accuser réception" réservé à archiviste/administrateur, même restriction
-- que les autres actions d'archiviste du circuit.
insert into public.workflow_transition_roles (workflow_transition_id, role_id)
select wt.id, r.id
from public.workflow_transitions wt
join public.workflow_definitions wd on wd.id = wt.workflow_definition_id
join public.roles r on r.organisation_id = wd.organisation_id and r.code in ('archiviste', 'administrateur')
where wd.code = 'ged-standard' and wt.code = 'recevoir'
on conflict (workflow_transition_id, role_id) do nothing;

-- RLS ged_versements: visible par son rédacteur ou par permission 'consulter'
-- sur l'entité ; modifiable par son rédacteur tant qu'il est en brouillon, ou
-- par quiconque a la permission 'modifier' (archiviste/administrateur) sinon
-- (ex. le classement, qui agit sur le versement via RPC pont).
alter table public.ged_versements enable row level security;

create policy ged_versements_select on public.ged_versements
  for select using (
    organisation_id = app.current_organisation_id()
    and (redacteur_id = auth.uid() or app.has_permission('ged', 'consulter', entite_id))
  );

create policy ged_versements_write on public.ged_versements
  for all using (
    organisation_id = app.current_organisation_id()
    and ((redacteur_id = auth.uid() and brouillon) or app.has_permission('ged', 'modifier', entite_id))
  )
  with check (organisation_id = app.current_organisation_id());

-- Traçabilité des accès en lecture (consultation/téléchargement) — un trigger
-- de table ne peut pas intercepter un SELECT, donc écriture uniquement via une
-- fonction dédiée (fn_consulter_document/fn_telecharger_document, migration
-- suivante), jamais en direct.
create table public.ged_consultations (
  id uuid primary key default extensions.gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  utilisateur_id uuid references public.utilisateurs(id) on delete set null,
  type_acces text not null check (type_acces in ('consultation', 'telechargement')),
  created_at timestamptz not null default now()
);

create index idx_ged_consultations_document on public.ged_consultations(document_id);

alter table public.ged_consultations enable row level security;

-- Journal de consultation réservé à ceux qui ont un rôle d'archivage sur le
-- document concerné (l'auditeur), pas à tout consultant.
create policy ged_consultations_select on public.ged_consultations
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = ged_consultations.document_id
        and d.organisation_id = app.current_organisation_id()
        and app.has_permission('ged', 'archiver', d.entite_id)
    )
  );

revoke insert, update, delete on public.ged_consultations from authenticated;

-- Confidentialité renforcée: un document classé "secrète" (liste partagée
-- courrier_confidentialite) exige un droit explicite (document_droits) ou la
-- qualité de créateur — la seule appartenance à l'entité / permission
-- générale 'consulter' ne suffit plus, et aucun repli sur les droits hérités
-- du dossier n'est appliqué pour ce niveau de classification.
create or replace function app.can_view_document(p_document_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc record;
  v_confidentialite_code text;
  v_result boolean;
begin
  select * into v_doc from public.documents where id = p_document_id;
  if not found then
    return false;
  end if;

  if v_doc.organisation_id <> app.current_organisation_id() then
    return false;
  end if;

  if v_doc.created_by = auth.uid() then
    return true;
  end if;

  select vl.code into v_confidentialite_code
  from public.valeurs_listes vl
  where vl.id = v_doc.confidentialite_valeur_id;

  if v_confidentialite_code is distinct from 'secrete' and app.has_permission('ged', 'consulter', v_doc.entite_id) then
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

  if v_confidentialite_code = 'secrete' then
    return false;
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

-- Index trigram pour la recherche documentaire (titre) — extension pg_trgm
-- déjà installée (0001_extensions.sql).
create index idx_documents_titre_trgm on public.documents using gin (titre extensions.gin_trgm_ops);
