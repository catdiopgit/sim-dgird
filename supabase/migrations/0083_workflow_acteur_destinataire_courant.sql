-- Nouveau type d'acteur de transition : 'destinataire_courant'. Les 7 types
-- existants (0020_workflow_v2.sql) décrivent tous une position structurelle
-- dans l'organigramme (rôle, fonction, entité, responsable d'entité,
-- supérieur hiérarchique...), jamais "la personne à qui CET objet précis est
-- actuellement affecté" — une donnée par instance (ex. courriers.
-- agent_destinataire_id), pas une caractéristique de poste. Résolution
-- assumée côté appelant (WorkflowEngineService reçoit un `destinataireObjet`
-- déjà résolu, à l'image du `entiteObjet` existant) : pour Courrier, l'agent
-- affecté si présent, sinon la personne réceptrice de l'entité affectée.
--
-- Additif : s'ajoute en OR aux acteurs déjà configurés sur une transition
-- (acteurDeTransitionAutorise autorise dès qu'UN acteur correspond), aucune
-- configuration existante n'est modifiée par cette migration.

alter type public.type_acteur_workflow add value 'destinataire_courant';

-- Statement séparé (autocommit, psql exécute chaque instruction de ce fichier
-- comme sa propre transaction faute de BEGIN explicite) : impossible d'utiliser
-- la nouvelle valeur d'enum dans la même transaction que l'ALTER TYPE ci-dessus.
alter table public.workflow_transition_roles
  drop constraint workflow_transition_roles_type_ck;

alter table public.workflow_transition_roles
  add constraint workflow_transition_roles_type_ck check (
    (type_acteur = 'role' and role_id is not null and fonction_id is null and entite_id is null and utilisateur_id is null)
    or (type_acteur = 'fonction' and fonction_id is not null and role_id is null and entite_id is null and utilisateur_id is null)
    or (type_acteur in ('entite', 'entite_et_descendants') and entite_id is not null and role_id is null and fonction_id is null and utilisateur_id is null)
    or (type_acteur = 'utilisateur' and utilisateur_id is not null and role_id is null and fonction_id is null and entite_id is null)
    or (type_acteur in ('responsable_entite_courante', 'superieur_hierarchique_courant', 'destinataire_courant') and role_id is null and fonction_id is null and entite_id is null and utilisateur_id is null)
  );
