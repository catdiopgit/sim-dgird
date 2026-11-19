-- SIM-DGIRD — remise à zéro de la GED (v8.6.10)
-- Supprime UNIQUEMENT les données de la GED : documents GED (et leurs versions,
-- droits, consultations), versements et leur circuit, notifications GED,
-- dossiers du plan de classement (droits et entités productrices compris).
-- Les documents des courriers, projets, marchés et missions ne sont pas touchés.
-- Les catégories GED et le circuit « ged-standard » (définition) sont conservés.
\set ON_ERROR_STOP on
begin;

create temp table _docs_ged on commit drop as
select d.id from documents d
 where (d.dossier_id is not null or d.versement_id is not null)
   and d.projet_id is null and d.livrable_id is null and d.avenant_id is null and d.decaissement_id is null
   and d.mission_id is null and d.marche_id is null and d.phase_marche_id is null and d.marche_candidat_id is null;

-- Fichiers à effacer du disque (lu par le script PowerShell après validation)
create temp table _fichiers on commit drop as
select v.storage_path from document_versions v join _docs_ged g on g.id = v.document_id;
\copy (select storage_path from _fichiers) to 'fichiers-ged-a-supprimer.txt'

create temp table _wf on commit drop as
select workflow_instance_id as id from ged_versements where workflow_instance_id is not null;

update documents set version_courante_id = null where id in (select id from _docs_ged);
delete from documents where id in (select id from _docs_ged);              -- versions, droits, consultations : cascade
update documents set versement_id = null, dossier_id = null where versement_id is not null or dossier_id is not null;
delete from ged_versements;
delete from workflow_instances where id in (select id from _wf);           -- historique : cascade
delete from notifications where lien_url like '/ged/%' or objet_module = 'ged';
update archivage_elements set dossier_ged_id = null where dossier_ged_id is not null;
delete from dossier_droits;
delete from ged_dossier_entites;
-- Dossiers : du plus profond au plus haut (parent_dossier_id en « restrict »)
do $$
begin
  while exists (select 1 from ged_dossiers) loop
    delete from ged_dossiers g where not exists (select 1 from ged_dossiers e where e.parent_dossier_id = g.id);
  end loop;
end $$;

select (select count(*) from ged_dossiers) as dossiers_restants,
       (select count(*) from ged_versements) as versements_restants,
       (select count(*) from documents where dossier_id is not null or versement_id is not null) as documents_ged_restants,
       (select count(*) from documents) as documents_autres_modules;
commit;
