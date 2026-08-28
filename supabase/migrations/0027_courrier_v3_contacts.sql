-- Gestion des courriers V3 (étape 3/8, cf. plan) : l'enregistrement d'un
-- courrier départ doit permettre de choisir un destinataire principal externe
-- recherchable/créable à la volée, et de distinguer ampliataires internes
-- (entité/utilisateur, mécanisme déjà existant) et externes. Aucune table
-- "contacts" n'existait jusqu'ici (§D/§F du plan).

create table public.contacts (
  id uuid primary key default extensions.gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  nom text not null,
  type text not null default 'administration' check (type in ('personne', 'entreprise', 'administration')),
  email text,
  telephone text,
  adresse text,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  supprime_le timestamptz
);

create index idx_contacts_organisation on public.contacts(organisation_id);
create index idx_contacts_nom on public.contacts(organisation_id, nom);

create trigger trg_contacts_updated_at
  before update on public.contacts
  for each row execute function app.set_updated_at();

alter table public.contacts enable row level security;

-- Même patron que les autres référentiels partagés (listes de valeurs...):
-- lecture pour toute l'organisation, écriture réservée à qui peut créer/
-- modifier des courriers (les contacts sont créés à la volée pendant la
-- saisie d'un courrier départ, pas via un module dédié).
create policy contacts_select on public.contacts
  for select using (organisation_id = app.current_organisation_id());

create policy contacts_write on public.contacts
  for all using (
    organisation_id = app.current_organisation_id()
    and (app.has_permission('courrier', 'creer') or app.has_permission('courrier', 'modifier'))
  )
  with check (organisation_id = app.current_organisation_id());

-- Destinataire principal externe d'un courrier départ, lié à un contact du
-- répertoire (destinataire_texte reste le nom affiché/dénormalisé, cohérent
-- avec le comportement existant quand aucun contact n'est sélectionné).
alter table public.courriers
  add column contact_destinataire_id uuid references public.contacts(id) on delete set null;

-- Ampliataires externes: courrier_destinataires ne supportait que des
-- bénéficiaires internes (entité/utilisateur). On ajoute contact_id sans
-- toucher au reste du modèle (type_diffusion principal/copie inchangé).
alter table public.courrier_destinataires
  add column contact_id uuid references public.contacts(id) on delete cascade;

alter table public.courrier_destinataires
  drop constraint courrier_destinataires_beneficiaire_ck;

alter table public.courrier_destinataires
  add constraint courrier_destinataires_beneficiaire_ck
  check (entite_id is not null or utilisateur_id is not null or contact_id is not null);
