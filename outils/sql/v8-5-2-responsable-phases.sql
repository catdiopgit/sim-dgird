-- v8.5.2 : responsable (intitulé) des phases de marché — appliqué aussi
-- automatiquement au démarrage de l'API (MarchesSchemaService).
\set ON_ERROR_STOP on
ALTER TABLE phases_type_marche ADD COLUMN IF NOT EXISTS responsable text;
ALTER TABLE phases_marche ADD COLUMN IF NOT EXISTS responsable text;
