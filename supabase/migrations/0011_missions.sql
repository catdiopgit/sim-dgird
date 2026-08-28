-- Missions, participants, actions de suivi, dépenses, + câblage du cache
-- d'étape de workflow (nécessite que courriers/documents/missions existent tous).

create table public.missions (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  entite_id uuid not null references public.entites(id) on delete restrict,
  reference text not null,
  objet text not null,
  responsable_id uuid references public.utilisateurs(id) on delete set null,
  lieu text,
  date_depart date not null,
  date_retour date not null,
  objectifs text,
  activites_prevues text,
  budget_prevu numeric(14, 2),
  budget_reel numeric(14, 2),
  workflow_instance_id uuid references public.workflow_instances(id) on delete set null,
  etape_code text,
  etape_libelle text,
  ordre_mission_document_id uuid references public.documents(id) on delete set null,
  compte_rendu_document_id uuid references public.documents(id) on delete set null,
  pv_document_id uuid references public.documents(id) on delete set null,
  recommandations text,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, reference)
);

create index idx_missions_organisation on public.missions(organisation_id);
create index idx_missions_entite on public.missions(entite_id);
create index idx_missions_workflow_instance on public.missions(workflow_instance_id);

create trigger trg_missions_updated_at
  before update on public.missions
  for each row execute function app.set_updated_at();

create table public.mission_participants (
  id uuid primary key default extensions.gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  utilisateur_id uuid not null references public.utilisateurs(id) on delete cascade,
  role_participant_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  unique (mission_id, utilisateur_id)
);

create index idx_mission_participants_mission on public.mission_participants(mission_id);

create table public.mission_actions_suivi (
  id uuid primary key default extensions.gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  description text not null,
  responsable_id uuid references public.utilisateurs(id) on delete set null,
  date_echeance date,
  statut_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_mission_actions_suivi_mission on public.mission_actions_suivi(mission_id);

create trigger trg_mission_actions_suivi_updated_at
  before update on public.mission_actions_suivi
  for each row execute function app.set_updated_at();

create table public.mission_depenses (
  id uuid primary key default extensions.gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  libelle text not null,
  montant numeric(14, 2) not null,
  date_depense date not null default current_date,
  justificatif_document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_mission_depenses_mission on public.mission_depenses(mission_id);

-- Synchronise etape_code/etape_libelle sur courriers/documents/missions à chaque
-- écriture dans workflow_historique (démarrage ou transition). Un seul trigger
-- générique plutôt que trois triggers dupliqués par domaine.
create or replace function app.sync_etape_cache()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_libelle text;
begin
  select code, libelle into v_code, v_libelle
  from public.workflow_etapes
  where id = new.etape_suivante_id;

  update public.courriers
  set etape_code = v_code, etape_libelle = v_libelle
  where workflow_instance_id = new.workflow_instance_id;

  update public.documents
  set etape_code = v_code, etape_libelle = v_libelle
  where workflow_instance_id = new.workflow_instance_id;

  update public.missions
  set etape_code = v_code, etape_libelle = v_libelle
  where workflow_instance_id = new.workflow_instance_id;

  return new;
end;
$$;

create trigger trg_workflow_historique_sync_etape
  after insert on public.workflow_historique
  for each row execute function app.sync_etape_cache();
