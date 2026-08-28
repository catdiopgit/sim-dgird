-- Projets V3 (2/3 — fonctions) : avancement calculé automatiquement à partir
-- du poids des livrables, contrôle du responsable (membre ou contact
-- d'exécution), contrôle de cohérence des décaissements, et mise à jour des
-- RPC existantes (fn_cloturer_livrable, fn_verifier_cloture_projet,
-- fn_historique_projet) pour le nouveau modèle livrables.projet_id direct.

-- §6 Avancement = somme des poids des livrables réalisés/validés, normalisée
-- par la somme totale des poids si elle ne vaut pas exactement 100 (le temps
-- que la répartition soit finalisée, l'avancement reste une valeur bornée et
-- cohérente plutôt que de dépasser 100 ou de sembler figé à 0).
create or replace function app.fn_recalculer_avancement_projet(p_projet_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_poids_total numeric;
  v_poids_realise numeric;
  v_avancement numeric;
begin
  select
    coalesce(sum(l.poids_pct), 0),
    coalesce(sum(l.poids_pct) filter (where vl.code in ('realise', 'valide')), 0)
  into v_poids_total, v_poids_realise
  from public.livrables l
  left join public.valeurs_listes vl on vl.id = l.statut_valeur_id
  where l.projet_id = p_projet_id;

  v_avancement := case when v_poids_total = 0 then 0
    else round(v_poids_realise / v_poids_total * 100, 2) end;

  update public.projets set avancement_pct = v_avancement where id = p_projet_id;
end;
$$;

create or replace function app.trg_livrables_recalcule_avancement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform app.fn_recalculer_avancement_projet(old.projet_id);
    return old;
  end if;

  perform app.fn_recalculer_avancement_projet(new.projet_id);
  if tg_op = 'UPDATE' and old.projet_id <> new.projet_id then
    perform app.fn_recalculer_avancement_projet(old.projet_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_livrables_recalcule_avancement on public.livrables;
create trigger trg_livrables_recalcule_avancement
  after insert or update of poids_pct, statut_valeur_id, projet_id or delete on public.livrables
  for each row execute function app.trg_livrables_recalcule_avancement();

-- §4 Le responsable d'un livrable doit être soit un membre actif du projet,
-- soit un contact d'exécution rattaché à ce même projet — jamais une
-- personne extérieure aux deux groupes.
create or replace function app.fn_verifier_responsable_livrable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.responsable_utilisateur_id is not null and not exists (
    select 1 from public.projet_membres pm
    where pm.projet_id = new.projet_id
      and pm.utilisateur_id = new.responsable_utilisateur_id
      and pm.date_retrait is null
  ) then
    raise exception 'Le responsable doit être un membre actif du projet';
  end if;

  if new.responsable_contact_id is not null and not exists (
    select 1 from public.projet_contacts_execution pce
    where pce.id = new.responsable_contact_id and pce.projet_id = new.projet_id
  ) then
    raise exception 'Le contact responsable n''appartient pas à ce projet';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_livrables_verifier_responsable on public.livrables;
create trigger trg_livrables_verifier_responsable
  before insert or update of responsable_utilisateur_id, responsable_contact_id, projet_id on public.livrables
  for each row execute function app.fn_verifier_responsable_livrable();

-- §5 Contrôles de cohérence : le cumul des pourcentages ne dépasse pas 100%,
-- et si le projet a un budget prévu, le cumul des montants ne le dépasse pas.
create or replace function app.fn_verifier_decaissement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cumul_pct numeric;
  v_cumul_montant numeric;
  v_budget_prevu numeric;
begin
  select coalesce(sum(pourcentage), 0), coalesce(sum(montant), 0)
  into v_cumul_pct, v_cumul_montant
  from public.decaissements
  where projet_id = new.projet_id and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_cumul_pct + new.pourcentage > 100 then
    raise exception 'Le cumul des pourcentages décaissés dépasserait 100%% (déjà % %%)', round(v_cumul_pct, 2);
  end if;

  select budget_prevu into v_budget_prevu from public.projets where id = new.projet_id;

  if v_budget_prevu is not null and v_cumul_montant + new.montant > v_budget_prevu then
    raise exception 'Le cumul des montants décaissés (%) dépasserait le budget prévu (%)',
      round(v_cumul_montant + new.montant, 2), round(v_budget_prevu, 2);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_decaissements_verifier on public.decaissements;
create trigger trg_decaissements_verifier
  before insert or update of pourcentage, montant, projet_id on public.decaissements
  for each row execute function app.fn_verifier_decaissement();

-- §3 fn_cloturer_livrable : le livrable référence désormais projet_id
-- directement (plus de join activite/phase) ; avancement_pct n'existe plus
-- sur livrables (l'avancement du projet se recalcule via le trigger
-- ci-dessus dès que statut_valeur_id change).
create or replace function public.fn_cloturer_livrable(p_livrable_id uuid, p_statut_code text default 'realise')
returns public.livrables
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_livrable public.livrables;
  v_organisation_id uuid;
  v_statut_id uuid;
  v_nb_documents integer;
begin
  if p_statut_code not in ('realise', 'valide') then
    raise exception 'Statut de clôture invalide : %', p_statut_code;
  end if;

  select * into v_livrable from public.livrables where id = p_livrable_id;
  if not found then
    raise exception 'Livrable % introuvable', p_livrable_id;
  end if;

  if not app.can_modifier_projet(v_livrable.projet_id) then
    raise exception 'Permission refusée sur le livrable %', p_livrable_id;
  end if;

  select organisation_id into v_organisation_id from public.projets where id = v_livrable.projet_id;

  select count(*) into v_nb_documents
  from public.documents d
  where d.livrable_id = p_livrable_id and d.supprime_le is null;

  if v_nb_documents = 0 then
    raise exception 'Impossible de clôturer le livrable : aucun document justificatif associé';
  end if;

  select vl.id into v_statut_id
  from public.valeurs_listes vl
  join public.listes_valeurs l on l.id = vl.liste_id
  where l.organisation_id = v_organisation_id and l.code = 'livrable_statut' and vl.code = p_statut_code;

  update public.livrables
  set statut_valeur_id = v_statut_id,
      date_remise = coalesce(date_remise, current_date)
  where id = p_livrable_id
  returning * into v_livrable;

  return v_livrable;
end;
$$;

-- §9 fn_verifier_cloture_projet : comptages livrables directement sur
-- projet_id, plus de somme des poids = 100% requise pour clôturer.
create or replace function app.fn_verifier_cloture_projet(p_projet_id uuid)
returns table (bloquant boolean, code text, message text)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_projet public.projets;
  v_nb_incomplets integer;
  v_nb_sans_justificatif integer;
  v_poids_total numeric;
  v_nb_avenants integer;
  v_types_contractuels text;
begin
  select * into v_projet from public.projets where id = p_projet_id;
  if not found then
    raise exception 'Projet % introuvable', p_projet_id;
  end if;

  if not app.can_view_projet(p_projet_id) then
    raise exception 'Permission refusée sur le projet %', p_projet_id;
  end if;

  return query select
    v_projet.responsable_id is null,
    'responsable'::text,
    case when v_projet.responsable_id is null
      then 'Le projet n''a pas de responsable désigné.'
      else 'Responsable désigné.' end;

  return query select false, 'entite'::text, 'Entité porteuse définie.'::text;

  select coalesce(sum(poids_pct), 0) into v_poids_total
  from public.livrables where projet_id = p_projet_id;

  return query select
    v_poids_total is distinct from 100,
    'poids_livrables'::text,
    case when v_poids_total is distinct from 100
      then format('La somme des quote-parts des livrables est de %s%% (doit être 100%%).', v_poids_total)
      else 'La somme des quote-parts des livrables est bien de 100%.' end;

  select count(*) into v_nb_incomplets
  from public.livrables l
  left join public.valeurs_listes vl on vl.id = l.statut_valeur_id
  where l.projet_id = p_projet_id
    and coalesce(vl.code, '') not in ('realise', 'valide', 'annule');

  return query select
    v_nb_incomplets > 0,
    'livrables_incomplets'::text,
    case when v_nb_incomplets > 0
      then format('%s livrable(s) à venir, en cours ou en retard.', v_nb_incomplets)
      else 'Tous les livrables sont réalisés, validés ou annulés.' end;

  select count(*) into v_nb_sans_justificatif
  from public.livrables l
  join public.valeurs_listes vl on vl.id = l.statut_valeur_id
  where l.projet_id = p_projet_id
    and vl.code in ('realise', 'valide')
    and not exists (select 1 from public.documents d where d.livrable_id = l.id and d.supprime_le is null);

  return query select
    v_nb_sans_justificatif > 0,
    'livrables_sans_justificatif'::text,
    case when v_nb_sans_justificatif > 0
      then format('%s livrable(s) réalisé(s) sans document justificatif.', v_nb_sans_justificatif)
      else 'Tous les livrables réalisés disposent d''un justificatif.' end;

  select count(*) into v_nb_avenants from public.avenants where projet_id = p_projet_id;
  return query select false, 'avenants'::text, format('%s avenant(s) enregistré(s).', v_nb_avenants);

  select string_agg(vl.libelle, ', ') into v_types_contractuels
  from public.documents d
  join public.valeurs_listes vl on vl.id = d.type_projet_valeur_id
  where d.projet_id = p_projet_id and d.supprime_le is null
    and vl.code in ('tdr', 'contrat', 'ordre-service');

  return query select
    false,
    'documents_contractuels'::text,
    case when v_types_contractuels is null
      then 'Aucun document contractuel (TDR / contrat / ordre de service) déposé — à vérifier.'
      else format('Documents contractuels présents : %s.', v_types_contractuels) end;
end;
$$;

-- §10 fn_historique_projet : plus de branches phases/activites/taches (mortes
-- depuis que l'app ne les utilise plus), branche livrables simplifiée
-- (projet_id direct), ajout decaissements et projet_contacts_execution.
create or replace function public.fn_historique_projet(p_projet_id uuid)
returns setof public.journal_audit
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not app.can_view_projet(p_projet_id) then
    raise exception 'Permission refusée sur le projet %', p_projet_id;
  end if;

  return query
  select ja.*
  from public.journal_audit ja
  where (ja.objet_type = 'projets' and ja.objet_id = p_projet_id)
     or (ja.objet_type = 'livrables' and ja.objet_id in (
           select id from public.livrables where projet_id = p_projet_id
         ))
     or (ja.objet_type = 'projet_membres' and ja.objet_id in (
           select id from public.projet_membres where projet_id = p_projet_id
         ))
     or (ja.objet_type = 'avenants' and ja.objet_id in (
           select id from public.avenants where projet_id = p_projet_id
         ))
     or (ja.objet_type = 'documents' and ja.objet_id in (
           select id from public.documents where projet_id = p_projet_id
         ))
     or (ja.objet_type = 'decaissements' and ja.objet_id in (
           select id from public.decaissements where projet_id = p_projet_id
         ))
     or (ja.objet_type = 'projet_contacts_execution' and ja.objet_id in (
           select id from public.projet_contacts_execution where projet_id = p_projet_id
         ))
  order by ja.created_at desc;
end;
$$;

drop function if exists public.fn_livrables_projet(uuid);

-- §6 Étend le dépôt de document projet aux justificatifs de décaissement.
-- drop d'abord l'ancienne signature à 6 arguments : sinon, avec des
-- paramètres tous par défaut à la fin, PostgreSQL/PostgREST hésiterait entre
-- les deux surcharges pour un appel à 6 arguments nommés.
drop function if exists public.fn_ajouter_document_projet(uuid, text, text, uuid, uuid, uuid);

create or replace function public.fn_ajouter_document_projet(
  p_projet_id uuid,
  p_titre text,
  p_description text default null,
  p_type_projet_valeur_id uuid default null,
  p_livrable_id uuid default null,
  p_avenant_id uuid default null,
  p_decaissement_id uuid default null
)
returns public.documents
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_projet public.projets;
  v_document public.documents;
begin
  select * into v_projet from public.projets where id = p_projet_id;
  if not found then
    raise exception 'Projet % introuvable', p_projet_id;
  end if;

  if not app.can_modifier_projet(p_projet_id) then
    raise exception 'Permission refusée sur le projet %', p_projet_id;
  end if;

  if p_livrable_id is not null and not exists (
    select 1 from public.livrables l where l.id = p_livrable_id and l.projet_id = p_projet_id
  ) then
    raise exception 'Livrable % n''appartient pas au projet %', p_livrable_id, p_projet_id;
  end if;

  if p_avenant_id is not null and not exists (
    select 1 from public.avenants where id = p_avenant_id and projet_id = p_projet_id
  ) then
    raise exception 'Avenant % n''appartient pas au projet %', p_avenant_id, p_projet_id;
  end if;

  if p_decaissement_id is not null and not exists (
    select 1 from public.decaissements where id = p_decaissement_id and projet_id = p_projet_id
  ) then
    raise exception 'Décaissement % n''appartient pas au projet %', p_decaissement_id, p_projet_id;
  end if;

  insert into public.documents (
    organisation_id, projet_id, livrable_id, avenant_id, decaissement_id, entite_id,
    titre, description, type_projet_valeur_id, created_by
  ) values (
    v_projet.organisation_id, p_projet_id, p_livrable_id, p_avenant_id, p_decaissement_id, v_projet.entite_id,
    p_titre, p_description, p_type_projet_valeur_id, auth.uid()
  )
  returning * into v_document;

  return v_document;
end;
$$;

grant execute on function public.fn_ajouter_document_projet(uuid, text, text, uuid, uuid, uuid, uuid) to authenticated;
