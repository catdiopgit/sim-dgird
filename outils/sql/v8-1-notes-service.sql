-- v8.1 : notes de service au personnel (portée de diffusion par entité,
-- lignes nominatives générées à la diffusion, délai de clôture paramétrable).
\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';

ALTER TABLE courrier_destinataires
  ADD COLUMN IF NOT EXISTS portee_diffusion text
    CHECK (portee_diffusion IN ('responsable', 'entite', 'entite_et_descendants')),
  ADD COLUMN IF NOT EXISTS destinataire_parent_id uuid
    REFERENCES courrier_destinataires(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_courrier_destinataires_parent ON courrier_destinataires(destinataire_parent_id);
CREATE INDEX IF NOT EXISTS idx_courrier_destinataires_utilisateur ON courrier_destinataires(utilisateur_id);

-- Délai de clôture automatique des notes diffusées au personnel (15 jours).
INSERT INTO parametres_organisation (organisation_id, cle, valeur, description)
SELECT o.id, 'notes_delai_cloture_jours', '{"jours": 15}'::jsonb,
       'Notes de service diffusées au personnel : clôture automatique après ce nombre de jours'
FROM organisations o
WHERE NOT EXISTS (SELECT 1 FROM parametres_organisation p WHERE p.organisation_id = o.id AND p.cle = 'notes_delai_cloture_jours');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'courrier_destinataires' AND column_name IN ('portee_diffusion', 'destinataire_parent_id');
SELECT cle, valeur FROM parametres_organisation WHERE cle = 'notes_delai_cloture_jours';
