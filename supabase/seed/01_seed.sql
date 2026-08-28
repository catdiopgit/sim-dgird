-- Données de référence de démonstration. Idempotent (ON CONFLICT DO NOTHING)
-- pour pouvoir être rejoué sans dupliquer. Lie les 6 utilisateurs déjà créés
-- dans Supabase Auth (voir test-users.local.md) à des profils utilisateurs.

-- 1. Organisation
insert into public.organisations (code, nom, description)
values ('sim-demo', 'Organisation Démo SIM', 'Organisation de démonstration créée par le seed de Phase 2.')
on conflict (code) do nothing;

-- 2. Modules (référentiel système)
insert into public.modules (code, libelle, icone, ordre) values
  ('courrier', 'Courriers', 'mail', 1),
  ('ged', 'GED', 'folder', 2),
  ('projets', 'Projets', 'project', 3),
  ('missions', 'Missions', 'car', 4),
  ('utilisateurs', 'Utilisateurs', 'team', 5),
  ('administration', 'Administration', 'setting', 6)
on conflict (code) do nothing;

-- 3. Actions (référentiel système)
insert into public.actions (code, libelle) values
  ('consulter', 'Consulter'),
  ('creer', 'Créer'),
  ('modifier', 'Modifier'),
  ('supprimer', 'Supprimer'),
  ('affecter', 'Affecter'),
  ('valider', 'Valider'),
  ('archiver', 'Archiver'),
  ('exporter', 'Exporter')
on conflict (code) do nothing;

-- 4. Types d'entités
insert into public.type_entites (organisation_id, code, libelle, ordre)
select o.id, v.code, v.libelle, v.ordre
from public.organisations o
cross join (values
  ('direction', 'Direction', 1),
  ('departement', 'Département', 2),
  ('service', 'Service', 3),
  ('bureau', 'Bureau', 4)
) as v(code, libelle, ordre)
where o.code = 'sim-demo'
on conflict (organisation_id, code) do nothing;

-- 5. Entités (arbre à profondeur variable, insérées parent avant enfant)
insert into public.entites (organisation_id, type_entite_id, code, libelle, sigle)
select o.id, te.id, 'dg', 'Direction Générale', 'DG'
from public.organisations o
join public.type_entites te on te.organisation_id = o.id and te.code = 'direction'
where o.code = 'sim-demo'
on conflict (organisation_id, code) do nothing;

insert into public.entites (organisation_id, type_entite_id, parent_entite_id, code, libelle, sigle)
select o.id, te.id, parent.id, 'spdg', 'Secrétariat Particulier du DG', 'SP/DG'
from public.organisations o
join public.type_entites te on te.organisation_id = o.id and te.code = 'bureau'
join public.entites parent on parent.organisation_id = o.id and parent.code = 'dg'
where o.code = 'sim-demo'
on conflict (organisation_id, code) do nothing;

insert into public.entites (organisation_id, type_entite_id, code, libelle, sigle)
select o.id, te.id, 'dma', 'Direction Métier A', 'DMA'
from public.organisations o
join public.type_entites te on te.organisation_id = o.id and te.code = 'direction'
where o.code = 'sim-demo'
on conflict (organisation_id, code) do nothing;

insert into public.entites (organisation_id, type_entite_id, parent_entite_id, code, libelle, sigle)
select o.id, te.id, parent.id, 'sa', 'Service Administratif', 'SA'
from public.organisations o
join public.type_entites te on te.organisation_id = o.id and te.code = 'service'
join public.entites parent on parent.organisation_id = o.id and parent.code = 'dma'
where o.code = 'sim-demo'
on conflict (organisation_id, code) do nothing;

-- 6. Fonctions
insert into public.fonctions (organisation_id, code, libelle)
select o.id, v.code, v.libelle
from public.organisations o
cross join (values
  ('admin-systeme', 'Administrateur Système'),
  ('directeur-general', 'Directeur Général'),
  ('secretaire', 'Secrétaire'),
  ('directeur', 'Directeur'),
  ('agent', 'Agent')
) as v(code, libelle)
where o.code = 'sim-demo'
on conflict (organisation_id, code) do nothing;

-- 7. Rôles
insert into public.roles (organisation_id, code, libelle, description, systeme)
select o.id, v.code, v.libelle, v.description, v.systeme
from public.organisations o
cross join (values
  ('administrateur', 'Administrateur', 'Accès complet à l''organisation', true),
  ('directeur-general', 'Directeur Général', 'Pilotage de l''organisation', false),
  ('secretaire', 'Secrétaire', 'Assistance et gestion du courrier', false),
  ('directeur', 'Directeur', 'Responsable d''une direction', false),
  ('agent', 'Agent', 'Agent d''exécution', false),
  ('archiviste', 'Archiviste', 'Validation et classement GED', false),
  ('chef-projet', 'Chef de Projet', 'Pilotage de projet', false),
  ('membre-projet', 'Membre Projet', 'Contributeur projet', false),
  ('validateur', 'Validateur', 'Validation transverse', false)
) as v(code, libelle, description, systeme)
where o.code = 'sim-demo'
on conflict (organisation_id, code) do nothing;

-- 8. Utilisateurs (liaison des 6 comptes Supabase Auth existants — test-users.local.md)
insert into public.utilisateurs (id, organisation_id, entite_id, nom, prenom, email, fonction_id, statut)
select '2ddcb4e0-c6c7-4ab8-abf0-74749fd912a9'::uuid, o.id, null, 'Système', 'Administrateur', 'admin@sim.local', f.id, 'actif'
from public.organisations o
join public.fonctions f on f.organisation_id = o.id and f.code = 'admin-systeme'
where o.code = 'sim-demo'
on conflict (id) do nothing;

insert into public.utilisateurs (id, organisation_id, entite_id, nom, prenom, email, fonction_id, statut)
select 'd8399611-9061-4bcf-bae9-256a5fa6952e'::uuid, o.id, e.id, 'Diallo', 'Amadou', 'dg@sim.local', f.id, 'actif'
from public.organisations o
join public.entites e on e.organisation_id = o.id and e.code = 'dg'
join public.fonctions f on f.organisation_id = o.id and f.code = 'directeur-general'
where o.code = 'sim-demo'
on conflict (id) do nothing;

insert into public.utilisateurs (id, organisation_id, entite_id, nom, prenom, email, fonction_id, statut)
select '61e815aa-0a7b-438c-a47f-81c2f7f5f8e4'::uuid, o.id, e.id, 'Camara', 'Fatou', 'secretaire.dg@sim.local', f.id, 'actif'
from public.organisations o
join public.entites e on e.organisation_id = o.id and e.code = 'spdg'
join public.fonctions f on f.organisation_id = o.id and f.code = 'secretaire'
where o.code = 'sim-demo'
on conflict (id) do nothing;

insert into public.utilisateurs (id, organisation_id, entite_id, nom, prenom, email, fonction_id, statut)
select '186d4939-6421-40de-ae98-cbf623b08e93'::uuid, o.id, e.id, 'Traoré', 'Moussa', 'directeur.direction@sim.local', f.id, 'actif'
from public.organisations o
join public.entites e on e.organisation_id = o.id and e.code = 'dma'
join public.fonctions f on f.organisation_id = o.id and f.code = 'directeur'
where o.code = 'sim-demo'
on conflict (id) do nothing;

insert into public.utilisateurs (id, organisation_id, entite_id, nom, prenom, email, fonction_id, statut)
select 'a6694f17-e86c-4f9c-94ed-74c6ed7cb960'::uuid, o.id, e.id, 'Koné', 'Aïcha', 'agent.direction1@sim.local', f.id, 'actif'
from public.organisations o
join public.entites e on e.organisation_id = o.id and e.code = 'dma'
join public.fonctions f on f.organisation_id = o.id and f.code = 'agent'
where o.code = 'sim-demo'
on conflict (id) do nothing;

insert into public.utilisateurs (id, organisation_id, entite_id, nom, prenom, email, fonction_id, statut)
select '5afa155d-1f85-47da-9c33-f81bf306fe6d'::uuid, o.id, e.id, 'Bamba', 'Ibrahim', 'agent.direction2@sim.local', f.id, 'actif'
from public.organisations o
join public.entites e on e.organisation_id = o.id and e.code = 'sa'
join public.fonctions f on f.organisation_id = o.id and f.code = 'agent'
where o.code = 'sim-demo'
on conflict (id) do nothing;

-- 9. Attribution des rôles (admin = portée organisation entière, entite_id null)
insert into public.utilisateur_roles (utilisateur_id, role_id, entite_id)
select '2ddcb4e0-c6c7-4ab8-abf0-74749fd912a9'::uuid, r.id, null
from public.roles r
join public.organisations o on o.id = r.organisation_id
where o.code = 'sim-demo' and r.code = 'administrateur'
on conflict (utilisateur_id, role_id) where entite_id is null do nothing;

insert into public.utilisateur_roles (utilisateur_id, role_id, entite_id)
select u.id, r.id, u.entite_id
from public.utilisateurs u
join public.roles r on r.organisation_id = u.organisation_id
join public.organisations o on o.id = u.organisation_id
where o.code = 'sim-demo'
  and (
    (u.id = 'd8399611-9061-4bcf-bae9-256a5fa6952e'::uuid and r.code = 'directeur-general')
    or (u.id = '61e815aa-0a7b-438c-a47f-81c2f7f5f8e4'::uuid and r.code = 'secretaire')
    or (u.id = '186d4939-6421-40de-ae98-cbf623b08e93'::uuid and r.code = 'directeur')
    or (u.id = 'a6694f17-e86c-4f9c-94ed-74c6ed7cb960'::uuid and r.code = 'agent')
    or (u.id = '5afa155d-1f85-47da-9c33-f81bf306fe6d'::uuid and r.code = 'agent')
  )
on conflict (utilisateur_id, role_id, entite_id) do nothing;

-- 10. Permissions (matrice représentative, pas exhaustive — voir Phase 3 pour la
-- curation complète via l'UI d'administration).
insert into public.permissions (role_id, module_id, action_id, portee)
select r.id, m.id, a.id, v.portee::public.portee_permission
from (values
  ('administrateur','courrier','consulter','organisation'),
  ('administrateur','courrier','creer','organisation'),
  ('administrateur','courrier','modifier','organisation'),
  ('administrateur','courrier','supprimer','organisation'),
  ('administrateur','courrier','affecter','organisation'),
  ('administrateur','courrier','valider','organisation'),
  ('administrateur','courrier','archiver','organisation'),
  ('administrateur','courrier','exporter','organisation'),
  ('administrateur','ged','consulter','organisation'),
  ('administrateur','ged','creer','organisation'),
  ('administrateur','ged','modifier','organisation'),
  ('administrateur','ged','supprimer','organisation'),
  ('administrateur','ged','valider','organisation'),
  ('administrateur','ged','archiver','organisation'),
  ('administrateur','ged','exporter','organisation'),
  ('administrateur','projets','consulter','organisation'),
  ('administrateur','projets','creer','organisation'),
  ('administrateur','projets','modifier','organisation'),
  ('administrateur','projets','supprimer','organisation'),
  ('administrateur','projets','affecter','organisation'),
  ('administrateur','projets','valider','organisation'),
  ('administrateur','missions','consulter','organisation'),
  ('administrateur','missions','creer','organisation'),
  ('administrateur','missions','modifier','organisation'),
  ('administrateur','missions','supprimer','organisation'),
  ('administrateur','missions','affecter','organisation'),
  ('administrateur','missions','valider','organisation'),
  ('administrateur','utilisateurs','consulter','organisation'),
  ('administrateur','utilisateurs','creer','organisation'),
  ('administrateur','utilisateurs','modifier','organisation'),
  ('administrateur','utilisateurs','supprimer','organisation'),
  ('administrateur','utilisateurs','affecter','organisation'),
  ('administrateur','administration','consulter','organisation'),
  ('administrateur','administration','creer','organisation'),
  ('administrateur','administration','modifier','organisation'),
  ('administrateur','administration','supprimer','organisation'),

  ('directeur-general','courrier','consulter','entite_et_descendants'),
  ('directeur-general','courrier','creer','entite_et_descendants'),
  ('directeur-general','courrier','modifier','entite_et_descendants'),
  ('directeur-general','courrier','affecter','entite_et_descendants'),
  ('directeur-general','courrier','valider','entite_et_descendants'),
  ('directeur-general','projets','consulter','entite_et_descendants'),
  ('directeur-general','projets','valider','entite_et_descendants'),
  ('directeur-general','missions','consulter','entite_et_descendants'),
  ('directeur-general','missions','valider','entite_et_descendants'),
  ('directeur-general','utilisateurs','consulter','entite_et_descendants'),

  ('secretaire','courrier','consulter','entite'),
  ('secretaire','courrier','creer','entite'),
  ('secretaire','courrier','affecter','entite'),

  ('directeur','courrier','consulter','entite_et_descendants'),
  ('directeur','courrier','creer','entite_et_descendants'),
  ('directeur','courrier','modifier','entite_et_descendants'),
  ('directeur','courrier','affecter','entite_et_descendants'),
  ('directeur','courrier','valider','entite_et_descendants'),
  ('directeur','projets','consulter','entite_et_descendants'),
  ('directeur','projets','creer','entite_et_descendants'),
  ('directeur','projets','valider','entite_et_descendants'),
  ('directeur','missions','consulter','entite_et_descendants'),
  ('directeur','missions','creer','entite_et_descendants'),
  ('directeur','missions','valider','entite_et_descendants'),

  ('agent','courrier','consulter','entite'),
  ('agent','courrier','creer','entite'),
  ('agent','projets','consulter','entite'),
  ('agent','missions','consulter','entite'),

  ('archiviste','ged','consulter','organisation'),
  ('archiviste','ged','modifier','organisation'),
  ('archiviste','ged','valider','organisation'),
  ('archiviste','ged','archiver','organisation'),

  ('chef-projet','projets','consulter','entite'),
  ('chef-projet','projets','creer','entite'),
  ('chef-projet','projets','modifier','entite'),
  ('chef-projet','projets','affecter','entite'),

  ('membre-projet','projets','consulter','personnel'),

  ('validateur','courrier','valider','entite_et_descendants'),
  ('validateur','projets','valider','entite_et_descendants'),
  ('validateur','missions','valider','entite_et_descendants')
) as v(role_code, module_code, action_code, portee)
join public.roles r on r.code = v.role_code
join public.modules m on m.code = v.module_code
join public.actions a on a.code = v.action_code
join public.organisations o on o.id = r.organisation_id
where o.code = 'sim-demo'
on conflict (role_id, module_id, action_id) do nothing;

-- 11. Listes de valeurs
insert into public.listes_valeurs (organisation_id, code, libelle, module_id)
select o.id, v.code, v.libelle, m.id
from public.organisations o
cross join (values
  ('courrier_type', 'Type de courrier', 'courrier'),
  ('courrier_priorite', 'Priorité de courrier', 'courrier'),
  ('courrier_confidentialite', 'Confidentialité', null),
  ('courrier_mode_transmission', 'Mode de transmission', 'courrier'),
  ('courrier_type_expediteur', 'Type d''expéditeur', 'courrier'),
  ('courrier_type_destinataire', 'Type de destinataire', 'courrier'),
  ('courrier_sens', 'Sens du courrier (numérotation)', 'courrier'),
  ('projet_statut', 'Statut de projet', 'projets'),
  ('projet_priorite', 'Priorité de projet', 'projets'),
  ('projet_role_equipe', 'Rôle dans l''équipe projet', 'projets'),
  ('projet_probabilite', 'Probabilité de risque', 'projets'),
  ('projet_impact', 'Impact de risque', 'projets'),
  ('projet_gravite', 'Gravité de problème', 'projets'),
  ('mission_type_participant', 'Type de participant à une mission', 'missions'),
  ('statut_generique', 'Statut générique (phase/activité/tâche/livrable/action)', null)
) as v(code, libelle, module_code)
left join public.modules m on m.code = v.module_code
where o.code = 'sim-demo'
on conflict (organisation_id, code) do nothing;

-- 12. Valeurs des listes
insert into public.valeurs_listes (liste_id, code, libelle, couleur, ordre, valeur_defaut)
select lv.id, v.code, v.libelle, v.couleur, v.ordre, v.valeur_defaut
from public.listes_valeurs lv
join public.organisations o on o.id = lv.organisation_id
join (values
  ('courrier_type','correspondance','Correspondance officielle','blue',1,true),
  ('courrier_type','note-service','Note de service','geekblue',2,false),
  ('courrier_type','circulaire','Circulaire','purple',3,false),
  ('courrier_type','rapport','Rapport','cyan',4,false),
  ('courrier_type','facture','Facture','gold',5,false),
  ('courrier_type','autre','Autre','default',6,false),

  ('courrier_priorite','normale','Normale','green',1,true),
  ('courrier_priorite','urgente','Urgente','orange',2,false),
  ('courrier_priorite','tres-urgente','Très urgente','red',3,false),

  ('courrier_confidentialite','publique','Publique','green',1,true),
  ('courrier_confidentialite','interne','Interne','blue',2,false),
  ('courrier_confidentialite','confidentielle','Confidentielle','orange',3,false),
  ('courrier_confidentialite','secrete','Secrète','red',4,false),

  ('courrier_mode_transmission','main-propre','Main propre','default',1,true),
  ('courrier_mode_transmission','postal','Courrier postal','default',2,false),
  ('courrier_mode_transmission','email','Email','blue',3,false),
  ('courrier_mode_transmission','fax','Fax','default',4,false),
  ('courrier_mode_transmission','portail','Portail en ligne','purple',5,false),

  ('courrier_type_expediteur','interne','Interne','blue',1,true),
  ('courrier_type_expediteur','externe-administration','Externe - Administration','geekblue',2,false),
  ('courrier_type_expediteur','externe-particulier','Externe - Particulier','default',3,false),
  ('courrier_type_expediteur','externe-entreprise','Externe - Entreprise','gold',4,false),

  ('courrier_type_destinataire','interne','Interne','blue',1,true),
  ('courrier_type_destinataire','externe-administration','Externe - Administration','geekblue',2,false),
  ('courrier_type_destinataire','externe-particulier','Externe - Particulier','default',3,false),
  ('courrier_type_destinataire','externe-entreprise','Externe - Entreprise','gold',4,false),

  ('courrier_sens','entrant','Entrant','blue',1,false),
  ('courrier_sens','sortant','Sortant','green',2,false),
  ('courrier_sens','interne','Interne','purple',3,false),

  ('projet_statut','a-faire','À faire','default',1,true),
  ('projet_statut','en-cours','En cours','blue',2,false),
  ('projet_statut','en-retard','En retard','red',3,false),
  ('projet_statut','termine','Terminé','green',4,false),
  ('projet_statut','annule','Annulé','default',5,false),

  ('projet_priorite','basse','Basse','green',1,false),
  ('projet_priorite','normale','Normale','blue',2,true),
  ('projet_priorite','haute','Haute','orange',3,false),
  ('projet_priorite','critique','Critique','red',4,false),

  ('projet_role_equipe','chef-de-projet','Chef de projet','purple',1,false),
  ('projet_role_equipe','membre','Membre','blue',2,true),
  ('projet_role_equipe','contributeur','Contributeur','default',3,false),

  ('projet_probabilite','faible','Faible','green',1,false),
  ('projet_probabilite','moyenne','Moyenne','orange',2,true),
  ('projet_probabilite','elevee','Élevée','red',3,false),

  ('projet_impact','faible','Faible','green',1,false),
  ('projet_impact','moyen','Moyen','orange',2,true),
  ('projet_impact','eleve','Élevé','red',3,false),

  ('projet_gravite','mineure','Mineure','green',1,false),
  ('projet_gravite','majeure','Majeure','orange',2,true),
  ('projet_gravite','critique','Critique','red',3,false),

  ('mission_type_participant','chef-mission','Chef de mission','purple',1,false),
  ('mission_type_participant','participant','Participant','blue',2,true),

  ('statut_generique','a-faire','À faire','default',1,true),
  ('statut_generique','en-cours','En cours','blue',2,false),
  ('statut_generique','en-retard','En retard','red',3,false),
  ('statut_generique','termine','Terminé','green',4,false),
  ('statut_generique','annule','Annulé','default',5,false)
) as v(liste_code, code, libelle, couleur, ordre, valeur_defaut) on lv.code = v.liste_code
where o.code = 'sim-demo'
on conflict (liste_id, code) do nothing;

-- 13. Règles de numérotation (courrier scindé par sens, missions global)
insert into public.regles_numerotation (organisation_id, module_id, valeur_liste_id, format, reinitialisation)
select o.id, m.id, vl.id, v.format, 'annuelle'::public.reinitialisation_numerotation
from public.organisations o
join public.modules m on m.code = 'courrier'
join public.listes_valeurs lv on lv.organisation_id = o.id and lv.code = 'courrier_sens'
join public.valeurs_listes vl on vl.liste_id = lv.id
join (values
  ('entrant', '{ANNEE}/E{SEQ:5}'),
  ('sortant', '{ANNEE}/S{SEQ:5}'),
  ('interne', '{ANNEE}/I{SEQ:5}')
) as v(sens_code, format) on v.sens_code = vl.code
where o.code = 'sim-demo'
on conflict (organisation_id, module_id, (coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid)), (coalesce(valeur_liste_id, '00000000-0000-0000-0000-000000000000'::uuid)))
do nothing;

insert into public.regles_numerotation (organisation_id, module_id, format, reinitialisation)
select o.id, m.id, 'MIS-{ANNEE}-{SEQ:4}', 'annuelle'::public.reinitialisation_numerotation
from public.organisations o
join public.modules m on m.code = 'missions'
where o.code = 'sim-demo'
on conflict (organisation_id, module_id, (coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid)), (coalesce(valeur_liste_id, '00000000-0000-0000-0000-000000000000'::uuid)))
do nothing;

-- 14. Workflow Courrier (§5 du cahier des charges)
insert into public.workflow_definitions (organisation_id, module_id, code, libelle, est_defaut)
select o.id, m.id, 'courrier-standard', 'Circuit courrier standard', true
from public.organisations o
join public.modules m on m.code = 'courrier'
where o.code = 'sim-demo'
on conflict (organisation_id, module_id, code) do nothing;

insert into public.workflow_etapes (workflow_definition_id, code, libelle, ordre, type_etape)
select wd.id, v.code, v.libelle, v.ordre, v.type_etape::public.type_etape_workflow
from public.workflow_definitions wd
join public.organisations o on o.id = wd.organisation_id
join (values
  ('creation', 'Création', 1, 'initiale'),
  ('enregistrement', 'Enregistrement', 2, 'intermediaire'),
  ('affectation', 'Affectation', 3, 'intermediaire'),
  ('traitement', 'Traitement', 4, 'intermediaire'),
  ('validation', 'Validation', 5, 'intermediaire'),
  ('signature', 'Signature', 6, 'intermediaire'),
  ('transmission', 'Transmission', 7, 'intermediaire'),
  ('cloture', 'Clôture', 8, 'intermediaire'),
  ('archivage', 'Archivage', 9, 'finale')
) as v(code, libelle, ordre, type_etape) on true
where o.code = 'sim-demo' and wd.code = 'courrier-standard'
on conflict (workflow_definition_id, code) do nothing;

insert into public.workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
select wd.id, src.id, tgt.id, v.code, v.libelle_action
from public.workflow_definitions wd
join public.organisations o on o.id = wd.organisation_id
join (values
  ('creation', 'enregistrement', 'enregistrer', 'Enregistrer'),
  ('enregistrement', 'affectation', 'affecter', 'Affecter'),
  ('affectation', 'traitement', 'traiter', 'Traiter'),
  ('traitement', 'validation', 'valider', 'Valider'),
  ('validation', 'signature', 'signer', 'Signer'),
  ('signature', 'transmission', 'transmettre', 'Transmettre'),
  ('transmission', 'cloture', 'cloturer', 'Clôturer'),
  ('cloture', 'archivage', 'archiver', 'Archiver')
) as v(source_code, cible_code, code, libelle_action) on true
join public.workflow_etapes src on src.workflow_definition_id = wd.id and src.code = v.source_code
join public.workflow_etapes tgt on tgt.workflow_definition_id = wd.id and tgt.code = v.cible_code
where o.code = 'sim-demo' and wd.code = 'courrier-standard'
on conflict (workflow_definition_id, code) do nothing;

insert into public.workflow_transition_roles (workflow_transition_id, role_id)
select wt.id, r.id
from public.workflow_transitions wt
join public.workflow_definitions wd on wd.id = wt.workflow_definition_id
join public.organisations o on o.id = wd.organisation_id
join (values ('valider'), ('signer'), ('archiver')) as v(code) on v.code = wt.code
join public.roles r on r.organisation_id = o.id and r.code in ('directeur', 'directeur-general', 'validateur', 'administrateur')
where o.code = 'sim-demo' and wd.code = 'courrier-standard'
on conflict (workflow_transition_id, role_id) do nothing;

-- 15. Workflow GED (§8 du cahier des charges)
insert into public.workflow_definitions (organisation_id, module_id, code, libelle, est_defaut)
select o.id, m.id, 'ged-standard', 'Circuit de versement GED standard', true
from public.organisations o
join public.modules m on m.code = 'ged'
where o.code = 'sim-demo'
on conflict (organisation_id, module_id, code) do nothing;

insert into public.workflow_etapes (workflow_definition_id, code, libelle, ordre, type_etape)
select wd.id, v.code, v.libelle, v.ordre, v.type_etape::public.type_etape_workflow
from public.workflow_definitions wd
join public.organisations o on o.id = wd.organisation_id
join (values
  ('depot', 'Dépôt', 1, 'initiale'),
  ('controle', 'Contrôle', 2, 'intermediaire'),
  ('validation', 'Validation par l''archiviste', 3, 'intermediaire'),
  ('classement', 'Classement documentaire', 4, 'intermediaire'),
  ('archivage', 'Archivage', 5, 'finale'),
  ('rejete', 'Rejeté', 6, 'rejet')
) as v(code, libelle, ordre, type_etape) on true
where o.code = 'sim-demo' and wd.code = 'ged-standard'
on conflict (workflow_definition_id, code) do nothing;

insert into public.workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
select wd.id, src.id, tgt.id, v.code, v.libelle_action
from public.workflow_definitions wd
join public.organisations o on o.id = wd.organisation_id
join (values
  ('depot', 'controle', 'controler', 'Contrôler'),
  ('controle', 'validation', 'valider-controle', 'Valider le contrôle'),
  ('controle', 'rejete', 'rejeter', 'Refuser le versement'),
  ('validation', 'classement', 'classer', 'Classer'),
  ('validation', 'rejete', 'demander-correction', 'Demander une correction'),
  ('classement', 'archivage', 'archiver', 'Archiver')
) as v(source_code, cible_code, code, libelle_action) on true
join public.workflow_etapes src on src.workflow_definition_id = wd.id and src.code = v.source_code
join public.workflow_etapes tgt on tgt.workflow_definition_id = wd.id and tgt.code = v.cible_code
where o.code = 'sim-demo' and wd.code = 'ged-standard'
on conflict (workflow_definition_id, code) do nothing;

insert into public.workflow_transition_roles (workflow_transition_id, role_id)
select wt.id, r.id
from public.workflow_transitions wt
join public.workflow_definitions wd on wd.id = wt.workflow_definition_id
join public.organisations o on o.id = wd.organisation_id
join (values ('valider-controle'), ('classer'), ('rejeter'), ('demander-correction'), ('archiver')) as v(code) on v.code = wt.code
join public.roles r on r.organisation_id = o.id and r.code in ('archiviste', 'administrateur')
where o.code = 'sim-demo' and wd.code = 'ged-standard'
on conflict (workflow_transition_id, role_id) do nothing;

-- 16. Workflow Missions (§12 du cahier des charges)
insert into public.workflow_definitions (organisation_id, module_id, code, libelle, est_defaut)
select o.id, m.id, 'mission-standard', 'Circuit mission standard', true
from public.organisations o
join public.modules m on m.code = 'missions'
where o.code = 'sim-demo'
on conflict (organisation_id, module_id, code) do nothing;

insert into public.workflow_etapes (workflow_definition_id, code, libelle, ordre, type_etape)
select wd.id, v.code, v.libelle, v.ordre, v.type_etape::public.type_etape_workflow
from public.workflow_definitions wd
join public.organisations o on o.id = wd.organisation_id
join (values
  ('creation', 'Création', 1, 'initiale'),
  ('soumission', 'Soumission', 2, 'intermediaire'),
  ('validation-soumission', 'Validation', 3, 'intermediaire'),
  ('preparation', 'Préparation', 4, 'intermediaire'),
  ('en-cours', 'Mission en cours', 5, 'intermediaire'),
  ('retour', 'Retour', 6, 'intermediaire'),
  ('rapport-pv', 'Rapport / PV', 7, 'intermediaire'),
  ('validation-rapport', 'Validation du rapport', 8, 'intermediaire'),
  ('cloture', 'Clôture', 9, 'finale')
) as v(code, libelle, ordre, type_etape) on true
where o.code = 'sim-demo' and wd.code = 'mission-standard'
on conflict (workflow_definition_id, code) do nothing;

insert into public.workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
select wd.id, src.id, tgt.id, v.code, v.libelle_action
from public.workflow_definitions wd
join public.organisations o on o.id = wd.organisation_id
join (values
  ('creation', 'soumission', 'soumettre', 'Soumettre'),
  ('soumission', 'validation-soumission', 'valider-soumission', 'Valider la soumission'),
  ('validation-soumission', 'preparation', 'preparer', 'Préparer'),
  ('preparation', 'en-cours', 'demarrer', 'Démarrer la mission'),
  ('en-cours', 'retour', 'retourner', 'Enregistrer le retour'),
  ('retour', 'rapport-pv', 'rediger-rapport', 'Rédiger le rapport/PV'),
  ('rapport-pv', 'validation-rapport', 'valider-rapport', 'Valider le rapport'),
  ('validation-rapport', 'cloture', 'cloturer', 'Clôturer')
) as v(source_code, cible_code, code, libelle_action) on true
join public.workflow_etapes src on src.workflow_definition_id = wd.id and src.code = v.source_code
join public.workflow_etapes tgt on tgt.workflow_definition_id = wd.id and tgt.code = v.cible_code
where o.code = 'sim-demo' and wd.code = 'mission-standard'
on conflict (workflow_definition_id, code) do nothing;

insert into public.workflow_transition_roles (workflow_transition_id, role_id)
select wt.id, r.id
from public.workflow_transitions wt
join public.workflow_definitions wd on wd.id = wt.workflow_definition_id
join public.organisations o on o.id = wd.organisation_id
join (values ('valider-soumission'), ('valider-rapport'), ('cloturer')) as v(code) on v.code = wt.code
join public.roles r on r.organisation_id = o.id and r.code in ('directeur', 'directeur-general', 'validateur', 'administrateur')
where o.code = 'sim-demo' and wd.code = 'mission-standard'
on conflict (workflow_transition_id, role_id) do nothing;

-- 17. GED: catégories et un premier dossier de démonstration
insert into public.ged_categories (organisation_id, code, libelle)
select o.id, v.code, v.libelle
from public.organisations o
cross join (values
  ('administratif', 'Administratif'),
  ('financier', 'Financier'),
  ('juridique', 'Juridique'),
  ('technique', 'Technique'),
  ('rh', 'Ressources Humaines')
) as v(code, libelle)
where o.code = 'sim-demo'
on conflict (organisation_id, code) do nothing;

insert into public.ged_dossiers (organisation_id, entite_id, code, libelle, categorie_id, created_by)
select o.id, e.id, 'correspondance-2026', 'Correspondance 2026', cat.id, u.id
from public.organisations o
join public.entites e on e.organisation_id = o.id and e.code = 'dg'
join public.ged_categories cat on cat.organisation_id = o.id and cat.code = 'administratif'
join public.utilisateurs u on u.id = '2ddcb4e0-c6c7-4ab8-abf0-74749fd912a9'::uuid
where o.code = 'sim-demo'
on conflict (organisation_id, code) do nothing;
