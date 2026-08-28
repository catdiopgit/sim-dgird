-- Nettoyage des données de test créées pour la vérification bout-en-bout du
-- moteur de workflow V2 (§F.5 du plan) : un circuit "Circuit interne
-- simplifié" construit uniquement via les opérations de l'UI admin
-- (create/update/delete équivalents à ceux exposés dans
-- src/services/administration/workflows.ts), déroulé sur un courrier réel
-- avec délégations, puis vérifié (historique + notifications + délégation).
-- Le rôle authenticated n'a pas de DROIT DELETE sur workflow_instances (par
-- design : un utilisateur normal ne supprime jamais une instance), donc ce
-- nettoyage passe par une migration plutôt que par l'API REST.

delete from public.workflow_instances
where id = 'f9ff8295-8e07-4b35-b1a4-394113504ce8';

delete from public.workflow_definitions
where id = '46f8735a-7058-46c0-a468-85cadd3ef7ed';
