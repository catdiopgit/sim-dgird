-- Projets: hiérarchie projet > phase > activité > tâche/livrable, plus suivi
-- risques/problèmes/décisions/réunions/indicateurs.

create table public.projets (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  entite_id uuid not null references public.entites(id) on delete restrict,
  code text not null,
  nom text not null,
  description text,
  responsable_id uuid references public.utilisateurs(id) on delete set null,
  sponsor_id uuid references public.utilisateurs(id) on delete set null,
  date_debut date,
  date_fin_prevue date,
  date_fin_reelle date,
  budget_prevu numeric(14, 2),
  budget_reel numeric(14, 2),
  statut_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  priorite_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  avancement_pct numeric(5, 2) not null default 0 check (avancement_pct between 0 and 100),
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create index idx_projets_organisation on public.projets(organisation_id);
create index idx_projets_entite on public.projets(entite_id);

create trigger trg_projets_updated_at
  before update on public.projets
  for each row execute function app.set_updated_at();

create table public.projet_membres (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  utilisateur_id uuid not null references public.utilisateurs(id) on delete cascade,
  role_equipe_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  date_ajout date not null default current_date,
  date_retrait date
);

create unique index idx_projet_membres_actif_uk on public.projet_membres(projet_id, utilisateur_id) where date_retrait is null;
create index idx_projet_membres_projet on public.projet_membres(projet_id);

create table public.phases (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  code text not null,
  nom text not null,
  description text,
  ordre integer not null default 0,
  date_debut_prevue date,
  date_fin_prevue date,
  date_debut_reelle date,
  date_fin_reelle date,
  statut_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (projet_id, code)
);

create index idx_phases_projet on public.phases(projet_id);

create trigger trg_phases_updated_at
  before update on public.phases
  for each row execute function app.set_updated_at();

create table public.activites (
  id uuid primary key default extensions.gen_random_uuid(),
  phase_id uuid not null references public.phases(id) on delete cascade,
  nom text not null,
  description text,
  responsable_id uuid references public.utilisateurs(id) on delete set null,
  date_debut_prevue date,
  date_fin_prevue date,
  date_debut_reelle date,
  date_fin_reelle date,
  statut_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  avancement_pct numeric(5, 2) not null default 0 check (avancement_pct between 0 and 100),
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_activites_phase on public.activites(phase_id);

create trigger trg_activites_updated_at
  before update on public.activites
  for each row execute function app.set_updated_at();

create table public.taches (
  id uuid primary key default extensions.gen_random_uuid(),
  activite_id uuid not null references public.activites(id) on delete cascade,
  nom text not null,
  description text,
  responsable_id uuid references public.utilisateurs(id) on delete set null,
  priorite_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  statut_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  date_debut_prevue date,
  date_echeance date,
  date_completion date,
  avancement_pct numeric(5, 2) not null default 0 check (avancement_pct between 0 and 100),
  estimation_heures numeric(6, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_taches_activite on public.taches(activite_id);

create trigger trg_taches_updated_at
  before update on public.taches
  for each row execute function app.set_updated_at();

create table public.livrables (
  id uuid primary key default extensions.gen_random_uuid(),
  activite_id uuid not null references public.activites(id) on delete cascade,
  nom text not null,
  description text,
  responsable_id uuid references public.utilisateurs(id) on delete set null,
  date_prevue date,
  date_remise date,
  statut_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  avancement_pct numeric(5, 2) not null default 0 check (avancement_pct between 0 and 100),
  document_id uuid references public.documents(id) on delete set null,
  workflow_instance_id uuid references public.workflow_instances(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_livrables_activite on public.livrables(activite_id);

create trigger trg_livrables_updated_at
  before update on public.livrables
  for each row execute function app.set_updated_at();

create table public.projet_risques (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  titre text not null,
  description text,
  probabilite_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  impact_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  statut_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  responsable_id uuid references public.utilisateurs(id) on delete set null,
  actions_mitigation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projet_risques_projet on public.projet_risques(projet_id);

create trigger trg_projet_risques_updated_at
  before update on public.projet_risques
  for each row execute function app.set_updated_at();

create table public.projet_problemes (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  titre text not null,
  description text,
  gravite_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  statut_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  responsable_id uuid references public.utilisateurs(id) on delete set null,
  date_signalement date not null default current_date,
  date_resolution date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projet_problemes_projet on public.projet_problemes(projet_id);

create trigger trg_projet_problemes_updated_at
  before update on public.projet_problemes
  for each row execute function app.set_updated_at();

create table public.projet_decisions (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  titre text not null,
  description text,
  date_decision date not null default current_date,
  decideur_id uuid references public.utilisateurs(id) on delete set null,
  impact text,
  created_at timestamptz not null default now()
);

create index idx_projet_decisions_projet on public.projet_decisions(projet_id);

create table public.projet_reunions (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  titre text not null,
  date_reunion timestamptz not null,
  lieu text,
  compte_rendu text,
  animateur_id uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_projet_reunions_projet on public.projet_reunions(projet_id);

create table public.projet_reunion_participants (
  id uuid primary key default extensions.gen_random_uuid(),
  reunion_id uuid not null references public.projet_reunions(id) on delete cascade,
  utilisateur_id uuid not null references public.utilisateurs(id) on delete cascade,
  present boolean not null default true,
  unique (reunion_id, utilisateur_id)
);

create table public.projet_indicateurs (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  code text not null,
  libelle text not null,
  valeur_cible numeric,
  valeur_actuelle numeric,
  unite text,
  date_mesure date not null default current_date,
  created_at timestamptz not null default now(),
  unique (projet_id, code, date_mesure)
);

create index idx_projet_indicateurs_projet on public.projet_indicateurs(projet_id);
