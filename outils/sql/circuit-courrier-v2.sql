-- Circuit courrier : traitement par l'agent, validation/clôture ou correction par le responsable d'entité.
\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';
BEGIN;
CREATE TEMP TABLE c AS
  SELECT d.id AS def,
    (SELECT id FROM workflow_etapes WHERE workflow_definition_id = d.id AND code = 'affection')    AS e_affectation,
    (SELECT id FROM workflow_etapes WHERE workflow_definition_id = d.id AND code = 'traitement')   AS e_traitement,
    (SELECT id FROM workflow_etapes WHERE workflow_definition_id = d.id AND code = 'validationdr') AS e_validation,
    (SELECT id FROM workflow_etapes WHERE workflow_definition_id = d.id AND code = 'validationdg') AS e_validation_dg,
    (SELECT id FROM workflow_etapes WHERE workflow_definition_id = d.id AND code = 'cloture')      AS e_cloture
  FROM workflow_definitions d WHERE d.libelle = 'Circuit courrier v1';

-- Libellés d'étapes
UPDATE workflow_etapes SET libelle = 'Validation du responsable' WHERE id = (SELECT e_validation FROM c);
UPDATE workflow_etapes SET libelle = 'Clôturé' WHERE id = (SELECT e_cloture FROM c);
UPDATE courriers SET etape_libelle = 'Validation du responsable' WHERE etape_libelle = 'ValidationDR';
UPDATE courriers SET etape_libelle = 'Clôturé' WHERE etape_libelle = 'Cloture';

-- Affecter : DG / Assistante DG, et le responsable de l'entité imputée (au lieu de tous les directeurs)
DELETE FROM workflow_transition_roles WHERE workflow_transition_id IN (SELECT id FROM workflow_transitions WHERE workflow_definition_id = (SELECT def FROM c) AND code = 'affecter')
  AND role_id = (SELECT id FROM roles WHERE code = 'directeur' LIMIT 1);
INSERT INTO workflow_transition_roles (workflow_transition_id, type_acteur)
  SELECT id, 'responsable_entite_courante' FROM workflow_transitions WHERE workflow_definition_id = (SELECT def FROM c) AND code = 'affecter';

-- Traiter et soumettre : Affectation -> Validation du responsable (agent destinataire, ou le responsable lui-même)
UPDATE workflow_transitions SET etape_cible_id = (SELECT e_validation FROM c), libelle_action = 'Traiter et soumettre'
  WHERE workflow_definition_id = (SELECT def FROM c) AND code = 'traiter';
DELETE FROM workflow_transition_roles WHERE workflow_transition_id IN (SELECT id FROM workflow_transitions WHERE workflow_definition_id = (SELECT def FROM c) AND code IN ('traiter', 'validerdr'));
INSERT INTO workflow_transition_roles (workflow_transition_id, type_acteur)
  SELECT t.id, a.type FROM workflow_transitions t, (VALUES ('destinataire_courant'::type_acteur_workflow), ('responsable_entite_courante')) a(type)
  WHERE t.workflow_definition_id = (SELECT def FROM c) AND t.code IN ('traiter', 'validerdr');
-- Ancienne étape « Traitement » (courriers déjà engagés) : simple sortie vers la validation
UPDATE workflow_transitions SET libelle_action = 'Soumettre au responsable'
  WHERE workflow_definition_id = (SELECT def FROM c) AND code = 'validerdr';

-- Valider et clôturer : Validation du responsable -> Clôturé (réutilise l'ancienne transition valider-dg)
UPDATE workflow_transitions SET etape_cible_id = (SELECT e_cloture FROM c), code = 'valider-cloturer', libelle_action = 'Valider et clôturer'
  WHERE workflow_definition_id = (SELECT def FROM c) AND code = 'valider-dg';
DELETE FROM workflow_transition_roles WHERE workflow_transition_id IN (SELECT id FROM workflow_transitions WHERE workflow_definition_id = (SELECT def FROM c) AND code = 'valider-cloturer');
INSERT INTO workflow_transition_roles (workflow_transition_id, type_acteur)
  SELECT id, 'responsable_entite_courante' FROM workflow_transitions WHERE workflow_definition_id = (SELECT def FROM c) AND code = 'valider-cloturer';

-- Demander une correction : Validation du responsable -> Affectation (retour à l'agent)
INSERT INTO workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
  SELECT def, e_validation, e_affectation, 'demander-correction', 'Demander une correction' FROM c
  WHERE NOT EXISTS (SELECT 1 FROM workflow_transitions WHERE workflow_definition_id = (SELECT def FROM c) AND code = 'demander-correction');
INSERT INTO workflow_transition_roles (workflow_transition_id, type_acteur)
  SELECT id, 'responsable_entite_courante' FROM workflow_transitions WHERE workflow_definition_id = (SELECT def FROM c) AND code = 'demander-correction'
  AND NOT EXISTS (SELECT 1 FROM workflow_transition_roles r WHERE r.workflow_transition_id = workflow_transitions.id);

-- Responsable de la DPRRA (acteur « responsable de l'entité courante »)
UPDATE entites SET responsable_utilisateur_id = '34a40302-0d0f-417f-84a9-a17a88f47fff'
  WHERE id = '1781431f-b5e9-46ef-800a-df86aff4cb9a' AND responsable_utilisateur_id IS NULL;

SELECT t.code, es.libelle AS de, ec.libelle AS vers, t.libelle_action, string_agg(coalesce(r.code, wtr.type_acteur::text), ', ') AS acteurs
FROM workflow_transitions t JOIN workflow_etapes es ON es.id = t.etape_source_id JOIN workflow_etapes ec ON ec.id = t.etape_cible_id
LEFT JOIN workflow_transition_roles wtr ON wtr.workflow_transition_id = t.id LEFT JOIN roles r ON r.id = wtr.role_id
WHERE t.workflow_definition_id = (SELECT def FROM c) GROUP BY t.code, es.libelle, ec.libelle, t.libelle_action, es.ordre ORDER BY es.ordre, t.code;
SELECT e.libelle, u.prenom || ' ' || u.nom AS responsable FROM entites e LEFT JOIN utilisateurs u ON u.id = e.responsable_utilisateur_id WHERE e.id = '1781431f-b5e9-46ef-800a-df86aff4cb9a';
COMMIT;
