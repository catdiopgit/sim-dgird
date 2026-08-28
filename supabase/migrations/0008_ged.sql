-- GED: catégories documentaires, arbre de dossiers, documents versionnés, droits.

create table public.ged_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  parent_categorie_id uuid references public.ged_categories(id) on delete restrict,
  code text not null,
  libelle text not null,
  description text,
  duree_conservation_mois integer,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create index idx_ged_categories_parent on public.ged_categories(parent_categorie_id);

create trigger trg_ged_categories_updated_at
  before update on public.ged_categories
  for each row execute function app.set_updated_at();

create table public.ged_dossiers (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  -- entite_id null = dossier transverse (partagé par toute l'organisation).
  entite_id uuid references public.entites(id) on delete set null,
  parent_dossier_id uuid references public.ged_dossiers(id) on delete restrict,
  code text not null,
  libelle text not null,
  description text,
  categorie_id uuid references public.ged_categories(id) on delete set null,
  chemin extensions.ltree,
  niveau integer not null default 0,
  icone text,
  couleur text,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  supprime_le timestamptz,
  unique (organisation_id, code)
);

create index idx_ged_dossiers_parent on public.ged_dossiers(parent_dossier_id);
create index idx_ged_dossiers_organisation on public.ged_dossiers(organisation_id);
create index idx_ged_dossiers_chemin on public.ged_dossiers using gist(chemin);

create trigger trg_ged_dossiers_updated_at
  before update on public.ged_dossiers
  for each row execute function app.set_updated_at();

-- Même patron que app.set_entite_chemin (voir 0002): limite connue identique
-- (déplacement de sous-arbre non recalculé récursivement).
create or replace function app.set_ged_dossier_chemin()
returns trigger
language plpgsql
as $$
declare
  v_parent_chemin extensions.ltree;
  v_parent_niveau integer;
  v_label text;
begin
  v_label := replace(new.id::text, '-', '_');

  if new.parent_dossier_id is null then
    new.chemin := v_label::extensions.ltree;
    new.niveau := 0;
  else
    select chemin, niveau into v_parent_chemin, v_parent_niveau
    from public.ged_dossiers
    where id = new.parent_dossier_id;

    if v_parent_chemin is null then
      raise exception 'Dossier parent % introuvable ou sans chemin', new.parent_dossier_id;
    end if;

    new.chemin := v_parent_chemin || v_label::extensions.ltree;
    new.niveau := v_parent_niveau + 1;
  end if;

  return new;
end;
$$;

create trigger trg_ged_dossiers_set_chemin
  before insert or update of parent_dossier_id on public.ged_dossiers
  for each row execute function app.set_ged_dossier_chemin();

create table public.documents (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  dossier_id uuid references public.ged_dossiers(id) on delete set null,
  -- categorie_id: proposée par le déposant, confirmée par l'archiviste durant le workflow.
  categorie_id uuid references public.ged_categories(id) on delete set null,
  entite_id uuid references public.entites(id) on delete set null,
  titre text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  workflow_instance_id uuid references public.workflow_instances(id) on delete set null,
  -- Cache en lecture seule de l'étape de workflow courante, maintenu par trigger
  -- (app.sync_etape_cache, câblé en 0011 une fois documents/courriers/missions
  -- existent tous). Ne jamais écrire directement: source de vérité = workflow_instances.
  etape_code text,
  etape_libelle text,
  -- FK ajoutée après création de document_versions (dépendance circulaire).
  version_courante_id uuid,
  confidentialite_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  duree_conservation_mois integer,
  date_versement timestamptz not null default now(),
  date_archivage timestamptz,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  supprime_le timestamptz
);

create index idx_documents_dossier on public.documents(dossier_id);
create index idx_documents_organisation on public.documents(organisation_id);
create index idx_documents_workflow_instance on public.documents(workflow_instance_id);

create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function app.set_updated_at();

create table public.document_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version_majeure integer not null default 1,
  version_mineure integer not null default 0,
  storage_path text not null,
  nom_fichier text not null,
  taille_octets bigint,
  type_mime text,
  hash_sha256 text,
  commentaire text,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version_majeure, version_mineure)
);

create index idx_document_versions_document on public.document_versions(document_id);

alter table public.documents
  add constraint documents_version_courante_fk
  foreign key (version_courante_id) references public.document_versions(id) on delete set null;

-- Droits par document / par dossier: exactement un bénéficiaire (rôle, utilisateur
-- ou entité) par ligne. Les droits d'un dossier sont hérités par ses documents sauf
-- document_droits explicite (règle applicative, cf. docs/security.md à écrire).
create table public.document_droits (
  id uuid primary key default extensions.gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  role_id uuid references public.roles(id) on delete cascade,
  utilisateur_id uuid references public.utilisateurs(id) on delete cascade,
  entite_id uuid references public.entites(id) on delete cascade,
  action_id uuid not null references public.actions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint document_droits_beneficiaire_ck check (
    (role_id is not null)::int + (utilisateur_id is not null)::int + (entite_id is not null)::int = 1
  )
);

create index idx_document_droits_document on public.document_droits(document_id);

create table public.dossier_droits (
  id uuid primary key default extensions.gen_random_uuid(),
  dossier_id uuid not null references public.ged_dossiers(id) on delete cascade,
  role_id uuid references public.roles(id) on delete cascade,
  utilisateur_id uuid references public.utilisateurs(id) on delete cascade,
  entite_id uuid references public.entites(id) on delete cascade,
  action_id uuid not null references public.actions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint dossier_droits_beneficiaire_ck check (
    (role_id is not null)::int + (utilisateur_id is not null)::int + (entite_id is not null)::int = 1
  )
);

create index idx_dossier_droits_dossier on public.dossier_droits(dossier_id);
