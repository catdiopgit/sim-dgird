-- Courrier entrant/sortant/interne, pièces jointes, diffusion multiple.

create type public.sens_courrier as enum ('entrant', 'sortant', 'interne');
create type public.type_diffusion_courrier as enum ('principal', 'copie');

create table public.courriers (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  entite_id uuid not null references public.entites(id) on delete restrict,
  sens public.sens_courrier not null,
  numero text not null,
  type_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  priorite_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  confidentialite_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  mode_transmission_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  objet text not null,
  date_courrier date not null default current_date,
  date_reception timestamptz,
  date_envoi timestamptz,
  expediteur_nom text,
  expediteur_type_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  -- destinataire_texte: destinataire externe (hors organisation). entite_destinataire_id/
  -- agent_destinataire_id: destinataire interne. Les deux peuvent être renseignés (ex. courrier
  -- sortant vers l'externe mais suivi en interne par une entité).
  destinataire_texte text,
  entite_destinataire_id uuid references public.entites(id) on delete set null,
  agent_destinataire_id uuid references public.utilisateurs(id) on delete set null,
  redacteur_id uuid references public.utilisateurs(id) on delete set null,
  workflow_instance_id uuid references public.workflow_instances(id) on delete set null,
  -- Cache en lecture seule (voir même remarque que documents.etape_code en 0008).
  etape_code text,
  etape_libelle text,
  courrier_parent_id uuid references public.courriers(id) on delete set null,
  observations text,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  supprime_le timestamptz,
  unique (organisation_id, numero)
);

create index idx_courriers_organisation on public.courriers(organisation_id);
create index idx_courriers_entite on public.courriers(entite_id);
create index idx_courriers_entite_destinataire on public.courriers(entite_destinataire_id);
create index idx_courriers_agent_destinataire on public.courriers(agent_destinataire_id);
create index idx_courriers_workflow_instance on public.courriers(workflow_instance_id);

create trigger trg_courriers_updated_at
  before update on public.courriers
  for each row execute function app.set_updated_at();

create table public.courrier_pieces_jointes (
  id uuid primary key default extensions.gen_random_uuid(),
  courrier_id uuid not null references public.courriers(id) on delete cascade,
  -- document_id: pièce également versée en GED. storage_path: pièce simple, non versée.
  document_id uuid references public.documents(id) on delete set null,
  storage_path text,
  nom_fichier text not null,
  taille_octets bigint,
  type_mime text,
  hash_sha256 text,
  est_scan boolean not null default false,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint courrier_pieces_jointes_source_ck check (document_id is not null or storage_path is not null)
);

create index idx_courrier_pieces_jointes_courrier on public.courrier_pieces_jointes(courrier_id);

create table public.courrier_destinataires (
  id uuid primary key default extensions.gen_random_uuid(),
  courrier_id uuid not null references public.courriers(id) on delete cascade,
  entite_id uuid references public.entites(id) on delete cascade,
  utilisateur_id uuid references public.utilisateurs(id) on delete cascade,
  type_diffusion public.type_diffusion_courrier not null default 'principal',
  date_prise_connaissance timestamptz,
  constraint courrier_destinataires_beneficiaire_ck check (entite_id is not null or utilisateur_id is not null)
);

create index idx_courrier_destinataires_courrier on public.courrier_destinataires(courrier_id);
