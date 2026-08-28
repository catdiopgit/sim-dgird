-- Données transactionnelles de démonstration (courriers, document, projet,
-- mission) pour que le dashboard ne soit pas vide au premier chargement.
-- Facilement supprimable: il suffit de ne pas exécuter ce fichier sur un
-- environnement "propre". Idempotent au niveau fichier (ignore silencieusement
-- si des courriers existent déjà pour l'organisation démo).

do $$
declare
  v_org_id uuid;
  v_entite_dg uuid;
  v_entite_dma uuid;
  v_secretaire_id uuid := '61e815aa-0a7b-438c-a47f-81c2f7f5f8e4';
  v_dg_id uuid := 'd8399611-9061-4bcf-bae9-256a5fa6952e';
  v_directeur_id uuid := '186d4939-6421-40de-ae98-cbf623b08e93';
  v_agent1_id uuid := 'a6694f17-e86c-4f9c-94ed-74c6ed7cb960';
  v_agent2_id uuid := '5afa155d-1f85-47da-9c33-f81bf306fe6d';
  v_type_correspondance uuid;
  v_priorite_normale uuid;
  v_confidentialite_interne uuid;
  v_sens_entrant uuid;
  v_sens_sortant uuid;
  v_sens_interne uuid;
  v_workflow_instance uuid;
  v_dossier_id uuid;
  v_document_id uuid;
  v_projet_id uuid;
  v_phase_id uuid;
  v_activite_id uuid;
  v_mission_id uuid;
  v_numero text;
  i int;
begin
  select id into v_org_id from public.organisations where code = 'sim-demo';
  if v_org_id is null then
    raise notice 'Organisation sim-demo introuvable, seed de démo ignoré.';
    return;
  end if;

  if exists (select 1 from public.courriers where organisation_id = v_org_id) then
    raise notice 'Des courriers existent déjà pour sim-demo, seed de démo ignoré.';
    return;
  end if;

  select id into v_entite_dg from public.entites where organisation_id = v_org_id and code = 'dg';
  select id into v_entite_dma from public.entites where organisation_id = v_org_id and code = 'dma';

  select vl.id into v_type_correspondance
  from public.valeurs_listes vl join public.listes_valeurs lv on lv.id = vl.liste_id
  where lv.organisation_id = v_org_id and lv.code = 'courrier_type' and vl.code = 'correspondance';

  select vl.id into v_priorite_normale
  from public.valeurs_listes vl join public.listes_valeurs lv on lv.id = vl.liste_id
  where lv.organisation_id = v_org_id and lv.code = 'courrier_priorite' and vl.code = 'normale';

  select vl.id into v_confidentialite_interne
  from public.valeurs_listes vl join public.listes_valeurs lv on lv.id = vl.liste_id
  where lv.organisation_id = v_org_id and lv.code = 'courrier_confidentialite' and vl.code = 'interne';

  select vl.id into v_sens_entrant
  from public.valeurs_listes vl join public.listes_valeurs lv on lv.id = vl.liste_id
  where lv.organisation_id = v_org_id and lv.code = 'courrier_sens' and vl.code = 'entrant';

  select vl.id into v_sens_sortant
  from public.valeurs_listes vl join public.listes_valeurs lv on lv.id = vl.liste_id
  where lv.organisation_id = v_org_id and lv.code = 'courrier_sens' and vl.code = 'sortant';

  select vl.id into v_sens_interne
  from public.valeurs_listes vl join public.listes_valeurs lv on lv.id = vl.liste_id
  where lv.organisation_id = v_org_id and lv.code = 'courrier_sens' and vl.code = 'interne';

  -- 2 courriers entrants. p_entite_id de fn_generer_numero reste null: nos
  -- règles de numérotation courrier sont scindées par sens, pas par entité.
  for i in 1..2 loop
    v_numero := app.fn_generer_numero(v_org_id, 'courrier', null, v_sens_entrant);
    v_workflow_instance := app.fn_demarrer_workflow('courrier', v_org_id, v_secretaire_id);

    insert into public.courriers (
      organisation_id, entite_id, sens, numero, type_valeur_id, priorite_valeur_id,
      confidentialite_valeur_id, objet, expediteur_nom, redacteur_id, workflow_instance_id,
      etape_code, etape_libelle, created_by
    )
    values (
      v_org_id, v_entite_dg, 'entrant', v_numero, v_type_correspondance, v_priorite_normale,
      v_confidentialite_interne, 'Courrier entrant de démonstration ' || i, 'Ministère Partenaire',
      v_secretaire_id, v_workflow_instance, 'creation', 'Création', v_secretaire_id
    );
  end loop;

  -- 2 courriers sortants
  for i in 1..2 loop
    v_numero := app.fn_generer_numero(v_org_id, 'courrier', null, v_sens_sortant);
    v_workflow_instance := app.fn_demarrer_workflow('courrier', v_org_id, v_directeur_id);

    insert into public.courriers (
      organisation_id, entite_id, sens, numero, type_valeur_id, priorite_valeur_id,
      confidentialite_valeur_id, objet, destinataire_texte, redacteur_id, workflow_instance_id,
      etape_code, etape_libelle, created_by
    )
    values (
      v_org_id, v_entite_dma, 'sortant', v_numero, v_type_correspondance, v_priorite_normale,
      v_confidentialite_interne, 'Courrier sortant de démonstration ' || i, 'Partenaire Externe',
      v_directeur_id, v_workflow_instance, 'creation', 'Création', v_directeur_id
    );
  end loop;

  -- 1 courrier interne
  v_numero := app.fn_generer_numero(v_org_id, 'courrier', null, v_sens_interne);
  v_workflow_instance := app.fn_demarrer_workflow('courrier', v_org_id, v_dg_id);

  insert into public.courriers (
    organisation_id, entite_id, sens, numero, type_valeur_id, priorite_valeur_id,
    confidentialite_valeur_id, objet, entite_destinataire_id, redacteur_id, workflow_instance_id,
    etape_code, etape_libelle, created_by
  )
  values (
    v_org_id, v_entite_dg, 'interne', v_numero, v_type_correspondance, v_priorite_normale,
    v_confidentialite_interne, 'Note de service interne de démonstration', v_entite_dma,
    v_dg_id, v_workflow_instance, 'creation', 'Création', v_dg_id
  );

  -- 1 document GED avec une version
  select id into v_dossier_id from public.ged_dossiers where organisation_id = v_org_id and code = 'correspondance-2026';

  insert into public.documents (organisation_id, dossier_id, entite_id, titre, description, created_by)
  values (v_org_id, v_dossier_id, v_entite_dg, 'Convention de partenariat 2026', 'Document de démonstration versé en GED.', v_secretaire_id)
  returning id into v_document_id;

  insert into public.document_versions (document_id, version_majeure, version_mineure, storage_path, nom_fichier, type_mime, created_by)
  values (v_document_id, 1, 0, 'demo/convention-partenariat-2026.pdf', 'convention-partenariat-2026.pdf', 'application/pdf', v_secretaire_id);

  update public.documents
  set version_courante_id = (
    select id from public.document_versions
    where document_id = v_document_id and version_majeure = 1 and version_mineure = 0
  )
  where id = v_document_id;

  -- 1 projet démo avec 1 phase / 1 activité / 1 tâche / 1 livrable
  insert into public.projets (organisation_id, entite_id, code, nom, description, responsable_id, date_debut, date_fin_prevue, created_by)
  values (
    v_org_id, v_entite_dma, 'PRJ-2026-001', 'Modernisation du système d''information',
    'Projet de démonstration.', v_directeur_id, current_date, current_date + interval '6 months', v_directeur_id
  )
  returning id into v_projet_id;

  insert into public.phases (projet_id, code, nom, ordre, date_debut_prevue, date_fin_prevue)
  values (v_projet_id, 'phase-1', 'Cadrage', 1, current_date, current_date + interval '1 month')
  returning id into v_phase_id;

  insert into public.activites (phase_id, nom, responsable_id, date_debut_prevue, date_fin_prevue, ordre)
  values (v_phase_id, 'Recueil des besoins', v_agent1_id, current_date, current_date + interval '2 weeks', 1)
  returning id into v_activite_id;

  insert into public.taches (activite_id, nom, responsable_id, date_debut_prevue, date_echeance)
  values (v_activite_id, 'Ateliers utilisateurs', v_agent1_id, current_date, current_date + interval '1 week');

  insert into public.livrables (activite_id, nom, responsable_id, date_prevue)
  values (v_activite_id, 'Cahier des charges', v_agent1_id, current_date + interval '2 weeks');

  insert into public.projet_membres (projet_id, utilisateur_id)
  values (v_projet_id, v_directeur_id), (v_projet_id, v_agent1_id);

  -- 1 mission démo avec 2 participants
  v_numero := app.fn_generer_numero(v_org_id, 'missions', null, null);
  v_workflow_instance := app.fn_demarrer_workflow('missions', v_org_id, v_directeur_id);

  insert into public.missions (
    organisation_id, entite_id, reference, objet, responsable_id, lieu,
    date_depart, date_retour, workflow_instance_id, etape_code, etape_libelle, created_by
  )
  values (
    v_org_id, v_entite_dma, v_numero, 'Mission de supervision régionale', v_directeur_id, 'Région Nord',
    current_date + interval '1 week', current_date + interval '10 days',
    v_workflow_instance, 'creation', 'Création', v_directeur_id
  )
  returning id into v_mission_id;

  insert into public.mission_participants (mission_id, utilisateur_id)
  values (v_mission_id, v_directeur_id), (v_mission_id, v_agent2_id);
end $$;
