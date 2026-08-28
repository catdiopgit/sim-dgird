-- Projets V2 (1/3 — schéma) : suivi des livrables au coeur de la fiche projet,
-- visibilité configurable, avenants, espace documentaire dédié, workflow de
-- clôture à 2 niveaux. Voir documentation/Gestion des projets V2.txt.

create type public.portee_visibilite_projet as enum ('membres', 'entites', 'agents', 'tous');
create type public.statut_cloture_projet as enum ('aucune', 'demandee', 'confirmee', 'rejetee');
create type public.type_impact_avenant as enum ('cree', 'modifie', 'supprime');

-- §2 Fiche projet : coordonnateur (distinct du responsable), lieu d'exécution,
-- portée de visibilité (§5) et workflow de clôture (§8/§9). cloture_* n'est
-- censé être écrit que par les RPC dédiées de 0066 (fn_demander/confirmer/
-- rejeter_cloture_projet) — voir la note en tête de 0067 sur ce choix.
alter table public.projets
  add column coordonnateur_id uuid references public.utilisateurs(id) on delete set null,
  add column lieu_execution text,
  add column portee_visibilite public.portee_visibilite_projet not null default 'membres',
  add column cloture_statut public.statut_cloture_projet not null default 'aucune',
  add column cloture_demandee_par uuid references public.utilisateurs(id) on delete set null,
  add column cloture_demandee_le timestamptz,
  add column cloture_confirmee_par uuid references public.utilisateurs(id) on delete set null,
  add column cloture_confirmee_le timestamptz,
  add column cloture_motif_rejet text;

-- §4 Membres : un membre "lecteur" (peut_modifier = false) peut consulter mais
-- pas écrire — app.can_modifier_projet (0066) s'appuie sur cette colonne.
alter table public.projet_membres
  add column peut_modifier boolean not null default true;

-- §5 Visibilité : portee_visibilite = 'entites'/'agents' se résout via ces
-- tables de sélection (vides pour 'membres'/'tous', qui n'en ont pas besoin).
create table public.projet_visibilite_entites (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  entite_id uuid not null references public.entites(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (projet_id, entite_id)
);

create index idx_projet_visibilite_entites_projet on public.projet_visibilite_entites(projet_id);

create table public.projet_visibilite_utilisateurs (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  utilisateur_id uuid not null references public.utilisateurs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (projet_id, utilisateur_id)
);

create index idx_projet_visibilite_utilisateurs_projet on public.projet_visibilite_utilisateurs(projet_id);

-- §7 Avenants
create table public.avenants (
  id uuid primary key default extensions.gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  reference text not null,
  date_avenant date not null default current_date,
  objet text not null,
  description text,
  motif text,
  montant numeric(14, 2),
  duree_initiale text,
  nouvelle_duree text,
  date_debut date,
  nouvelle_date_fin date,
  observations text,
  created_by uuid references public.utilisateurs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (projet_id, reference)
);

create index idx_avenants_projet on public.avenants(projet_id);

create trigger trg_avenants_updated_at
  before update on public.avenants
  for each row execute function app.set_updated_at();

-- Livrables impactés par un avenant (création/modification/suppression, avec
-- indication fine si l'échéance et/ou le contenu du livrable changent).
create table public.avenant_livrables (
  id uuid primary key default extensions.gen_random_uuid(),
  avenant_id uuid not null references public.avenants(id) on delete cascade,
  -- null quand type_impact = 'cree' et que le nouveau livrable n'existe pas
  -- encore au moment de la saisie de l'avenant.
  livrable_id uuid references public.livrables(id) on delete set null,
  type_impact public.type_impact_avenant not null,
  echeance_modifiee boolean not null default false,
  contenu_modifie boolean not null default false,
  commentaire text,
  created_at timestamptz not null default now()
);

create index idx_avenant_livrables_avenant on public.avenant_livrables(avenant_id);
create index idx_avenant_livrables_livrable on public.avenant_livrables(livrable_id);

-- §6 Espace documentaire : un document métier projet n'a pas besoin d'être
-- classé dans le plan de classement GED (dossier_id) pour exister. projet_id
-- est toujours renseigné (même pour un document rattaché à un livrable ou un
-- avenant) afin que les policies RLS (0067) n'aient qu'une seule colonne à
-- tester plutôt que de remonter la hiérarchie livrable/avenant -> projet.
alter table public.documents
  add column projet_id uuid references public.projets(id) on delete cascade,
  add column livrable_id uuid references public.livrables(id) on delete set null,
  add column avenant_id uuid references public.avenants(id) on delete set null,
  add column type_projet_valeur_id uuid references public.valeurs_listes(id) on delete set null;

create index idx_documents_projet on public.documents(projet_id);
create index idx_documents_livrable on public.documents(livrable_id);
create index idx_documents_avenant on public.documents(avenant_id);

-- §10 Traçabilité : le trigger d'audit générique (0013) n'était câblé que sur
-- `projets`. On l'étend aux tables filles pour que fn_historique_projet
-- (0066) ait une source complète.
create trigger trg_audit_phases
  after insert or update or delete on public.phases
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_activites
  after insert or update or delete on public.activites
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_taches
  after insert or update or delete on public.taches
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_livrables
  after insert or update or delete on public.livrables
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_projet_membres
  after insert or update or delete on public.projet_membres
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_avenants
  after insert or update or delete on public.avenants
  for each row execute function app.fn_audit_trigger();

-- Codes d'action supplémentaires pour le journal d'audit (0066 insère des
-- lignes manuelles dans journal_audit depuis les RPC de clôture, même patron
-- que fn_deverrouiller_courrier en 0047).
insert into public.actions (code, libelle) values
  ('demander_cloture', 'Demander la clôture'),
  ('confirmer_cloture', 'Confirmer la clôture'),
  ('rejeter_cloture', 'Rejeter la clôture')
on conflict (code) do nothing;

-- §6 Référentiel des types de document projet (TDR, contrat, OS, ...),
-- indépendant de ged_categories (qui sert au classement/à la conservation GED).
insert into public.listes_valeurs (organisation_id, code, libelle, module_id)
select o.id, 'document_type_projet', 'Type de document (projet)', m.id
from public.organisations o
join public.modules m on m.code = 'projets'
where not exists (
  select 1 from public.listes_valeurs lv
  where lv.organisation_id = o.id and lv.code = 'document_type_projet'
);

insert into public.valeurs_listes (liste_id, code, libelle, couleur, ordre, valeur_defaut)
select lv.id, v.code, v.libelle, v.couleur, v.ordre, v.valeur_defaut
from public.listes_valeurs lv
cross join (values
  ('tdr', 'TDR', 'blue', 1, false),
  ('contrat', 'Contrat', 'geekblue', 2, false),
  ('ordre-service', 'Ordre de service', 'purple', 3, false),
  ('avenant', 'Avenant', 'gold', 4, false),
  ('rapport', 'Rapport', 'cyan', 5, false),
  ('proces-verbal', 'Procès-verbal', 'orange', 6, false),
  ('technique', 'Document technique', 'default', 7, false),
  ('administratif', 'Document administratif', 'default', 8, false),
  ('justificatif-livrable', 'Justificatif de livrable', 'green', 9, false),
  ('autre', 'Autre', 'default', 10, true)
) as v(code, libelle, couleur, ordre, valeur_defaut)
where lv.code = 'document_type_projet'
  and not exists (
    select 1 from public.valeurs_listes existant
    where existant.liste_id = lv.id and existant.code = v.code
  );

-- §3 Statuts de livrable : le référentiel générique (statut_generique) ne
-- distingue pas "réalisé" (fait, pas encore validé) de "validé" (contrôlé par
-- le responsable), pourtant nécessaires pour fn_cloturer_livrable (0066).
-- Nouvelle liste dédiée, remplace statut_generique sur `livrables` uniquement.
insert into public.listes_valeurs (organisation_id, code, libelle, module_id)
select o.id, 'livrable_statut', 'Statut de livrable', m.id
from public.organisations o
join public.modules m on m.code = 'projets'
where not exists (
  select 1 from public.listes_valeurs lv
  where lv.organisation_id = o.id and lv.code = 'livrable_statut'
);

insert into public.valeurs_listes (liste_id, code, libelle, couleur, ordre, valeur_defaut)
select lv.id, v.code, v.libelle, v.couleur, v.ordre, v.valeur_defaut
from public.listes_valeurs lv
cross join (values
  ('a-venir', 'À venir', 'default', 1, true),
  ('en-cours', 'En cours', 'blue', 2, false),
  ('en-retard', 'En retard', 'red', 3, false),
  ('realise', 'Réalisé', 'gold', 4, false),
  ('valide', 'Validé', 'green', 5, false),
  ('annule', 'Annulé', 'default', 6, false)
) as v(code, libelle, couleur, ordre, valeur_defaut)
where lv.code = 'livrable_statut'
  and not exists (
    select 1 from public.valeurs_listes existant
    where existant.liste_id = lv.id and existant.code = v.code
  );

-- Bascule les livrables existants (créés avant cette migration avec
-- statut_generique) vers l'équivalent le plus proche dans livrable_statut.
-- La correspondance est calculée dans un CTE séparé : dans un
-- `UPDATE ... FROM ... JOIN`, la table cible (`l`) n'est visible que dans
-- WHERE/SET, pas dans les conditions JOIN...ON du FROM.
with mapping (ancien_code, nouveau_code) as (
  values ('a-faire', 'a-venir'), ('en-cours', 'en-cours'), ('en-retard', 'en-retard'),
         ('termine', 'realise'), ('annule', 'annule')
),
correspondance as (
  select distinct
    a.id as activite_id,
    ov.id as ancien_statut_id,
    nv.id as nouveau_statut_id
  from public.activites a
  join public.phases ph on ph.id = a.phase_id
  join public.projets p on p.id = ph.projet_id
  join public.listes_valeurs ol on ol.organisation_id = p.organisation_id and ol.code = 'statut_generique'
  join public.valeurs_listes ov on ov.liste_id = ol.id
  join mapping m on m.ancien_code = ov.code
  join public.listes_valeurs nl on nl.organisation_id = p.organisation_id and nl.code = 'livrable_statut'
  join public.valeurs_listes nv on nv.liste_id = nl.id and nv.code = m.nouveau_code
)
update public.livrables l
set statut_valeur_id = c.nouveau_statut_id
from correspondance c
where l.activite_id = c.activite_id
  and l.statut_valeur_id = c.ancien_statut_id;
