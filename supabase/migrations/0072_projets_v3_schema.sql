-- Projets V3 (1/3 — schéma) : un projet est désormais constitué uniquement de
-- livrables (rattachés directement au projet, plus via une activité), avec un
-- poids (quote-part) par livrable et un avancement calculé automatiquement.
-- Ajoute l'organisme chargé de l'exécution (+ contacts d'exécution, pour les
-- consultants/entreprises externes sans compte SIM) et les décaissements.
-- Voir documentation/Gestion de projet V3.txt.
--
-- Les tables phases/activites/taches restent en base (données existantes
-- préservées) mais ne sont plus référencées par l'application à partir de
-- cette version — voir la note en tête de 0074 sur ce choix.

create type public.organisme_execution_type as enum ('organisation', 'consultant', 'entreprise', 'externe');

-- §4 Contacts d'exécution : personnes de l'organisme chargé d'exécuter le
-- projet (consultant, entreprise...) qui n'ont pas forcément de compte SIM.
-- Un responsable de livrable (ou le chargé de l'exécution du projet) est
-- donc soit un membre du projet (utilisateur SIM), soit un contact d'ici.
create table public.projet_contacts_execution (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  nom text not null,
  fonction text,
  email text,
  telephone text,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_projet_contacts_execution_projet on public.projet_contacts_execution(projet_id);

-- §1 Organisme chargé de l'exécution + chargé de l'exécution (distinct du
-- responsable du projet, qui reste projets.responsable_id).
alter table public.projets
  add column organisme_execution_type public.organisme_execution_type not null default 'organisation',
  add column organisme_execution_nom text,
  add column charge_execution_utilisateur_id uuid references public.utilisateurs(id) on delete set null,
  add column charge_execution_contact_id uuid references public.projet_contacts_execution(id) on delete set null,
  add constraint projets_charge_execution_unique_ck check (
    not (charge_execution_utilisateur_id is not null and charge_execution_contact_id is not null)
  );

-- §5 Décaissements
create table public.decaissements (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  pourcentage numeric(5, 2) not null check (pourcentage > 0 and pourcentage <= 100),
  montant numeric(14, 2) not null check (montant > 0),
  date_decaissement date not null default current_date,
  observations text,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_decaissements_projet on public.decaissements(projet_id);

create trigger trg_decaissements_updated_at
  before update on public.decaissements
  for each row execute function app.set_updated_at();

-- Justificatif d'un décaissement, même patron que documents.livrable_id/
-- avenant_id (0065) : reste visible dans l'espace documentaire du projet.
alter table public.documents
  add column decaissement_id uuid references public.decaissements(id) on delete set null;

create index idx_documents_decaissement on public.documents(decaissement_id);

create trigger trg_audit_decaissements
  after insert or update or delete on public.decaissements
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_projet_contacts_execution
  after insert or update or delete on public.projet_contacts_execution
  for each row execute function app.fn_audit_trigger();

-- §2/§3 Livrables : rattachés directement au projet (plus à une activité),
-- avec un poids (quote-part) et un responsable membre-ou-contact.
alter table public.livrables
  add column projet_id uuid references public.projets(id) on delete cascade;

update public.livrables l
set projet_id = ph.projet_id
from public.activites a
join public.phases ph on ph.id = a.phase_id
where a.id = l.activite_id;

alter table public.livrables
  alter column projet_id set not null;

drop index if exists idx_livrables_activite;
create index idx_livrables_projet on public.livrables(projet_id);

-- Les anciennes policies (0016/0067) référencent livrables.activite_id dans
-- leur USING/WITH CHECK : Postgres refuse un DROP COLUMN tant qu'une policy
-- en dépend. On les retire ici, 0074 les recrée proprement sur projet_id.
drop policy if exists livrables_select on public.livrables;
drop policy if exists livrables_write on public.livrables;

alter table public.livrables
  drop column activite_id;

alter table public.livrables
  add column poids_pct numeric(5, 2) not null default 0 check (poids_pct >= 0 and poids_pct <= 100);

-- Backfill de confort : répartit 100% également entre les livrables déjà
-- existants d'un même projet (le dernier absorbe l'arrondi), pour ne pas
-- laisser les données actuelles à 0%. Sans effet sur un projet sans livrable.
with numerotes as (
  select id, projet_id,
    row_number() over (partition by projet_id order by created_at) as rang,
    count(*) over (partition by projet_id) as total
  from public.livrables
),
repartition as (
  select id,
    case when rang = total then 100 - floor(100.0 / total) * (total - 1)
         else floor(100.0 / total) end as poids
  from numerotes
)
update public.livrables l
set poids_pct = r.poids
from repartition r
where r.id = l.id;

alter table public.livrables
  rename column responsable_id to responsable_utilisateur_id;

alter table public.livrables
  add column responsable_contact_id uuid references public.projet_contacts_execution(id) on delete set null,
  add constraint livrables_responsable_unique_ck check (
    not (responsable_utilisateur_id is not null and responsable_contact_id is not null)
  );

alter table public.livrables
  drop column avancement_pct;

-- Recalcule une bonne fois pour toutes l'avancement des projets existants
-- (0073 attache ensuite le trigger qui le maintient à jour automatiquement).
update public.projets p
set avancement_pct = coalesce((
  select case when sum(l.poids_pct) = 0 then 0
    else round(
      sum(l.poids_pct) filter (where vl.code in ('realise', 'valide'))
      / greatest(sum(l.poids_pct), 1) * 100,
      2
    )
  end
  from public.livrables l
  left join public.valeurs_listes vl on vl.id = l.statut_valeur_id
  where l.projet_id = p.id
), 0);
