-- SIM-DGIRD — purge des données de test avant la mise en production
-- Lancé par purger-donnees-test.ps1 (ne pas exécuter seul : la sauvegarde est faite par le .ps1).
--
-- SUPPRIME : courriers (destinataires, pièces jointes, décharges, circuits),
--            projets (phases, activités, livrables, avenants, décaissements, membres, réunions…),
--            GED (documents, versions, droits, consultations, versements, lancements automatiques,
--            dossiers créés au classement des versements), notifications de ces modules.
-- CONSERVE : utilisateurs, rôles, permissions, fonctions, délégations, entités, organisation,
--            paramètres (SMTP, listes de valeurs, numérotation), circuits (définitions),
--            plan de classement GED et ses droits, marchés (déjà vides), journal d'audit.
-- Remet à zéro les compteurs de numérotation des courriers et des projets.
--
-- Variables psql : simulation (on/off), contacts (on/off)
\set ON_ERROR_STOP on
begin;

-- 1. Ce qui va être supprimé -------------------------------------------------
create temp table _docs on commit drop as
select d.id from documents d
 where d.marche_id is null and d.phase_marche_id is null and d.marche_candidat_id is null
   and d.mission_id is null;

create temp table _wf on commit drop as
select workflow_instance_id as id from courriers where workflow_instance_id is not null
union select workflow_instance_id from ged_versements where workflow_instance_id is not null
union select workflow_instance_id from livrables where workflow_instance_id is not null;

-- Dossiers créés par le classement des versements (et leurs sous-dossiers) ;
-- le plan de classement lui-même n'est pas touché.
create temp table _dossiers on commit drop as
with recursive arbre as (
  select id from ged_dossiers where id in (select dossier_versement_id from ged_versements where dossier_versement_id is not null)
  union
  select g.id from ged_dossiers g join arbre a on g.parent_dossier_id = a.id
)
select id from arbre;

-- Fichiers à mettre de côté (lus par le .ps1 après validation)
\copy (select storage_path from courrier_pieces_jointes where storage_path is not null) to 'fichiers-courrier.txt'
\copy (select v.storage_path from document_versions v join _docs d on d.id = v.document_id where v.storage_path is not null) to 'fichiers-ged.txt'

select 'AVANT' as etape,
  (select count(*) from courriers) as courriers,
  (select count(*) from courrier_pieces_jointes) as pieces_jointes,
  (select count(*) from projets) as projets,
  (select count(*) from _docs) as documents,
  (select count(*) from ged_versements) as versements,
  (select count(*) from _dossiers) as dossiers_versement,
  (select count(*) from _wf) as circuits;

-- 2. Suppression -------------------------------------------------------------
delete from courriers;                       -- destinataires, actions, pièces jointes : cascade
delete from projets;                         -- phases, activités, tâches, livrables, avenants, décaissements… : cascade
update documents set version_courante_id = null where id in (select id from _docs);
delete from documents where id in (select id from _docs);   -- versions, droits, consultations : cascade
delete from ged_versements;                  -- éléments versés : cascade
delete from ged_lancements_auto;
delete from archivage_operations;            -- éléments d'archivage : cascade
delete from workflow_instances where id in (select id from _wf)   -- historique : cascade
   or workflow_definition_id in (select d.id from workflow_definitions d join modules m on m.id = d.module_id
                                  where m.code in ('courrier', 'ged', 'projets'));
delete from notifications
 where objet_module in ('courrier', 'courriers', 'projets', 'ged')
    or lien_url like '/courrier%' or lien_url like '/projets%' or lien_url like '/ged%';

-- Dossiers de versement, du plus profond au plus haut (parent en « restrict »)
do $$
begin
  while exists (select 1 from ged_dossiers where id in (select id from _dossiers)) loop
    delete from ged_dossiers g
     where g.id in (select id from _dossiers)
       and not exists (select 1 from ged_dossiers e where e.parent_dossier_id = g.id);
  end loop;
end $$;

\if :contacts
delete from contacts;                        -- carnet d'adresses des courriers
\endif

-- 3. Numérotation : le prochain courrier repart à 0000001, le prochain projet à 001
update regles_numerotation r set sequence_courante = 0, updated_at = now()
  from modules m
 where m.id = r.module_id and m.code in ('courrier', 'projets');

-- 4. Contrôle ----------------------------------------------------------------
select 'APRES' as etape,
  (select count(*) from courriers) as courriers,
  (select count(*) from projets) as projets,
  (select count(*) from documents) as documents_restants_marches,
  (select count(*) from ged_versements) as versements,
  (select count(*) from ged_dossiers) as dossiers_plan_classement,
  (select count(*) from utilisateurs) as utilisateurs,
  (select count(*) from entites) as entites,
  (select count(*) from contacts) as contacts,
  (select count(*) from workflow_instances) as circuits_restants;

\if :simulation
rollback;
\echo 'SIMULATION : rien n''a été supprimé (transaction annulée).'
\else
commit;
\echo 'Purge validée.'
\endif
