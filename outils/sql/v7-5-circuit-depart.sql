-- v7.5 : circuit des courriers de départ (Enregistré -> Expédié -> Clôturé par décharge)
-- et numérotation séparée DEP-AAAA-NNNN.
\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';

DO $$
DECLARE
  r_org record;
  v_module uuid;
  v_liste uuid;
  v_sortant uuid;
  v_def uuid;
  v_e1 uuid; v_e2 uuid; v_e3 uuid;
  v_t uuid;
  v_format text;
BEGIN
  SELECT id INTO v_module FROM modules WHERE code = 'courrier';
  FOR r_org IN SELECT id FROM organisations LOOP
    -- 1. Valeur 'sortant' de la liste courrier_sens
    SELECT id INTO v_liste FROM listes_valeurs WHERE organisation_id = r_org.id AND code = 'courrier_sens';
    IF v_liste IS NULL THEN
      RAISE NOTICE 'Organisation % : liste courrier_sens absente, ignorée', r_org.id;
      CONTINUE;
    END IF;
    SELECT id INTO v_sortant FROM valeurs_listes WHERE liste_id = v_liste AND code = 'sortant';
    IF v_sortant IS NULL THEN
      RAISE NOTICE 'Organisation % : valeur sortant absente, ignorée', r_org.id;
      CONTINUE;
    END IF;

    -- 2. Numérotation séparée des départs
    IF NOT EXISTS (SELECT 1 FROM regles_numerotation WHERE organisation_id = r_org.id AND module_id = v_module
                   AND entite_id IS NULL AND valeur_liste_id = v_sortant) THEN
      SELECT format INTO v_format FROM regles_numerotation
       WHERE organisation_id = r_org.id AND module_id = v_module AND entite_id IS NULL AND valeur_liste_id IS NULL;
      v_format := coalesce(replace(v_format, 'COURRIER', 'DEP'), 'DEP-{ANNEE}-{SEQ:4}');
      INSERT INTO regles_numerotation (organisation_id, module_id, entite_id, valeur_liste_id, format, sequence_courante, reinitialisation)
      VALUES (r_org.id, v_module, NULL, v_sortant, v_format, 0, 'annuelle');
      RAISE NOTICE 'Numérotation départ : %', v_format;
    END IF;

    -- 3. Circuit départ
    SELECT id INTO v_def FROM workflow_definitions WHERE organisation_id = r_org.id AND module_id = v_module AND code = 'courrier-depart';
    IF v_def IS NULL THEN
      INSERT INTO workflow_definitions (organisation_id, module_id, code, libelle, description, actif, est_defaut)
      VALUES (r_org.id, v_module, 'courrier-depart', 'Circuit courrier départ',
              'Enregistrement par le Bureau Courrier, expédition, puis clôture par la décharge.', true, false)
      RETURNING id INTO v_def;
      INSERT INTO workflow_etapes (workflow_definition_id, code, libelle, ordre, type_etape)
        VALUES (v_def, 'enregistre', 'Enregistré', 1, 'initiale') RETURNING id INTO v_e1;
      INSERT INTO workflow_etapes (workflow_definition_id, code, libelle, ordre, type_etape)
        VALUES (v_def, 'expedie', 'Expédié', 2, 'intermediaire') RETURNING id INTO v_e2;
      INSERT INTO workflow_etapes (workflow_definition_id, code, libelle, ordre, type_etape)
        VALUES (v_def, 'cloture', 'Clôturé', 3, 'finale') RETURNING id INTO v_e3;
      INSERT INTO workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
        VALUES (v_def, v_e1, v_e2, 'expedier', 'Expédier') RETURNING id INTO v_t;
      INSERT INTO workflow_transition_roles (workflow_transition_id, type_acteur, role_id)
        SELECT v_t, 'role', id FROM roles WHERE code IN ('operateur-de-numerisation', 'assistante-dg');
    END IF;

    -- 4. Association sens 'sortant' -> circuit départ
    INSERT INTO workflow_definition_associations (workflow_definition_id, valeur_liste_id)
    VALUES (v_def, v_sortant)
    ON CONFLICT (valeur_liste_id) DO UPDATE SET workflow_definition_id = excluded.workflow_definition_id;
  END LOOP;
END $$;

-- Contrôle
SELECT wd.libelle AS circuit, vl.code AS sens
FROM workflow_definition_associations a
JOIN workflow_definitions wd ON wd.id = a.workflow_definition_id
JOIN valeurs_listes vl ON vl.id = a.valeur_liste_id;
SELECT r.format, vl.code AS sens, r.sequence_courante FROM regles_numerotation r
LEFT JOIN valeurs_listes vl ON vl.id = r.valeur_liste_id
JOIN modules m ON m.id = r.module_id WHERE m.code = 'courrier';
