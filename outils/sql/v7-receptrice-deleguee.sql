-- v7 : la personne réceptrice ne traite plus à la place de l'agent ;
-- elle peut affecter au nom du responsable si l'entité l'y autorise.
\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';

-- 1. Nouveau type d'acteur (hors transaction : valeur d'enum utilisable seulement après commit)
ALTER TYPE public.type_acteur_workflow ADD VALUE IF NOT EXISTS 'receptrice_deleguee_entite_courante';

BEGIN;
-- 2. Option par entité
ALTER TABLE public.entites ADD COLUMN IF NOT EXISTS receptrice_peut_affecter boolean NOT NULL DEFAULT false;

-- 3. Contrainte de cohérence des acteurs
ALTER TABLE public.workflow_transition_roles DROP CONSTRAINT IF EXISTS workflow_transition_roles_type_ck;
ALTER TABLE public.workflow_transition_roles ADD CONSTRAINT workflow_transition_roles_type_ck CHECK (
  (type_acteur = 'role' AND role_id IS NOT NULL AND fonction_id IS NULL AND entite_id IS NULL AND utilisateur_id IS NULL)
  OR (type_acteur = 'fonction' AND fonction_id IS NOT NULL AND role_id IS NULL AND entite_id IS NULL AND utilisateur_id IS NULL)
  OR (type_acteur IN ('entite', 'entite_et_descendants') AND entite_id IS NOT NULL AND role_id IS NULL AND fonction_id IS NULL AND utilisateur_id IS NULL)
  OR (type_acteur = 'utilisateur' AND utilisateur_id IS NOT NULL AND role_id IS NULL AND fonction_id IS NULL AND entite_id IS NULL)
  OR (type_acteur IN ('responsable_entite_courante', 'superieur_hierarchique_courant', 'destinataire_courant', 'receptrice_deleguee_entite_courante')
      AND role_id IS NULL AND fonction_id IS NULL AND entite_id IS NULL AND utilisateur_id IS NULL)
);

-- 4. « Affecter » ouvert à la personne réceptrice déléguée
INSERT INTO workflow_transition_roles (workflow_transition_id, type_acteur)
  SELECT t.id, 'receptrice_deleguee_entite_courante'
  FROM workflow_transitions t JOIN workflow_definitions d ON d.id = t.workflow_definition_id
  WHERE d.libelle = 'Circuit courrier v1' AND t.code = 'affecter'
    AND NOT EXISTS (SELECT 1 FROM workflow_transition_roles r
                    WHERE r.workflow_transition_id = t.id AND r.type_acteur = 'receptrice_deleguee_entite_courante');
-- 5. Centre de notifications : l'historique de test antérieur au 11/11 est marqué lu
--    (sinon des centaines de notifications non lues pour les détenteurs de rôles).
UPDATE notifications SET lu = true, lu_le = now() WHERE NOT lu AND created_at < '2026-11-11';
COMMIT;

-- Contrôle : responsable et personne réceptrice des entités
SELECT e.code, e.libelle,
       ur.prenom || ' ' || ur.nom AS responsable,
       up.prenom || ' ' || up.nom AS personne_receptrice,
       e.receptrice_peut_affecter
FROM entites e
LEFT JOIN utilisateurs ur ON ur.id = e.responsable_utilisateur_id
LEFT JOIN utilisateurs up ON up.id = e.personne_receptrice_id
WHERE e.actif ORDER BY e.code;
