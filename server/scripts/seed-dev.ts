import 'dotenv/config';
import type { DataSource } from 'typeorm';
import dataSource from '../config/data-source';

// Jeu de données minimal pour développer/tester en local contre une organisation
// et un utilisateur déjà existants (créés manuellement, ex. via un premier
// utilisateur bootstrap) : modules/actions/permissions de base, une entité
// racine, un rôle "tout-organisation" attribué à l'utilisateur, un workflow
// Courrier à 2 étapes (Enregistré -> Traité), une règle de numérotation et les
// paramètres de routage des courriers entrants. Idempotent (relançable sans
// dupliquer).
//
// Usage : npx ts-node -P server/tsconfig.json server/scripts/seed-dev.ts <organisation_code> <email_utilisateur>

async function upsertModule(ds: DataSource, code: string, libelle: string): Promise<string> {
  const existing: Array<{ id: string }> = await ds.query('select id from modules where code = $1', [code]);
  if (existing[0]) return existing[0].id;
  const inserted: Array<{ id: string }> = await ds.query(
    'insert into modules (code, libelle) values ($1, $2) returning id',
    [code, libelle],
  );
  return inserted[0].id;
}

async function upsertAction(ds: DataSource, code: string, libelle: string): Promise<string> {
  const existing: Array<{ id: string }> = await ds.query('select id from actions where code = $1', [code]);
  if (existing[0]) return existing[0].id;
  const inserted: Array<{ id: string }> = await ds.query(
    'insert into actions (code, libelle) values ($1, $2) returning id',
    [code, libelle],
  );
  return inserted[0].id;
}

async function main() {
  const [organisationCode, email] = process.argv.slice(2);
  if (!organisationCode || !email) {
    console.error('Usage : seed-dev.ts <organisation_code> <email_utilisateur>');
    process.exit(1);
  }

  const ds = await dataSource.initialize();
  try {
    const orgRows: Array<{ id: string }> = await ds.query('select id from organisations where code = $1', [
      organisationCode,
    ]);
    if (!orgRows[0]) throw new Error(`Organisation '${organisationCode}' introuvable`);
    const orgId = orgRows[0].id;

    const userRows: Array<{ id: string }> = await ds.query('select id from utilisateurs where email = $1', [email]);
    if (!userRows[0]) throw new Error(`Utilisateur '${email}' introuvable`);
    const userId = userRows[0].id;

    const modAdmin = await upsertModule(ds, 'administration', 'Administration');
    const modUtil = await upsertModule(ds, 'utilisateurs', 'Utilisateurs');
    const modCourrier = await upsertModule(ds, 'courrier', 'Courrier');
    const modGed = await upsertModule(ds, 'ged', 'GED');
    const modProjets = await upsertModule(ds, 'projets', 'Projets');
    const modMissions = await upsertModule(ds, 'missions', 'Missions');
    const modMarches = await upsertModule(ds, 'marches', 'Marchés');

    const actConsulter = await upsertAction(ds, 'consulter', 'Consulter');
    const actCreer = await upsertAction(ds, 'creer', 'Créer');
    const actModifier = await upsertAction(ds, 'modifier', 'Modifier');
    const actAffecter = await upsertAction(ds, 'affecter', 'Affecter');
    const actTransmettre = await upsertAction(ds, 'transmettre', 'Transmettre');
    const actDeverrouiller = await upsertAction(ds, 'deverrouiller', 'Déverrouiller');
    const actArchiver = await upsertAction(ds, 'archiver', 'Archiver');
    const actValider = await upsertAction(ds, 'valider', 'Valider');
    const actSupprimer = await upsertAction(ds, 'supprimer', 'Supprimer');
    console.log('Modules/actions OK.');

    let typeEntiteRows: Array<{ id: string }> = await ds.query(
      "select id from type_entites where code = 'direction' and organisation_id = $1",
      [orgId],
    );
    const typeEntiteId =
      typeEntiteRows[0]?.id ??
      (
        await ds.query(
          'insert into type_entites (organisation_id, code, libelle) values ($1, $2, $3) returning id',
          [orgId, 'direction', 'Direction'],
        )
      )[0].id;

    let entiteRows: Array<{ id: string }> = await ds.query(
      "select id from entites where code = 'DG' and organisation_id = $1",
      [orgId],
    );
    const entiteId =
      entiteRows[0]?.id ??
      (
        await ds.query(
          `insert into entites (organisation_id, type_entite_id, code, libelle, responsable_utilisateur_id)
           values ($1, $2, 'DG', 'Direction Générale', $3) returning id`,
          [orgId, typeEntiteId, userId],
        )
      )[0].id;
    console.log(`Entité racine OK (${entiteId}).`);

    let roleRows: Array<{ id: string }> = await ds.query(
      "select id from roles where code = 'admin_dev' and organisation_id = $1",
      [orgId],
    );
    const roleId =
      roleRows[0]?.id ??
      (
        await ds.query('insert into roles (organisation_id, code, libelle) values ($1, $2, $3) returning id', [
          orgId,
          'admin_dev',
          'Administrateur (dev)',
        ])
      )[0].id;

    const grant = async (moduleId: string, actionId: string, portee = 'organisation') => {
      const existing = await ds.query(
        'select id from permissions where role_id = $1 and module_id = $2 and action_id = $3',
        [roleId, moduleId, actionId],
      );
      if (existing[0]) return;
      await ds.query('insert into permissions (role_id, module_id, action_id, portee) values ($1, $2, $3, $4)', [
        roleId,
        moduleId,
        actionId,
        portee,
      ]);
    };
    for (const [moduleId, actionId] of [
      [modAdmin, actConsulter],
      [modAdmin, actCreer],
      [modAdmin, actModifier],
      [modUtil, actConsulter],
      [modUtil, actCreer],
      [modUtil, actModifier],
      [modUtil, actAffecter],
      [modCourrier, actConsulter],
      [modCourrier, actCreer],
      [modCourrier, actModifier],
      [modCourrier, actAffecter],
      [modCourrier, actTransmettre],
      [modCourrier, actDeverrouiller],
      [modGed, actConsulter],
      [modGed, actCreer],
      [modGed, actModifier],
      [modGed, actArchiver],
      [modGed, actValider],
      [modProjets, actConsulter],
      [modProjets, actCreer],
      [modProjets, actModifier],
      [modProjets, actValider],
      [modProjets, actSupprimer],
      [modMissions, actConsulter],
      [modMissions, actCreer],
      [modMissions, actModifier],
      [modMissions, actValider],
      [modMissions, actSupprimer],
      [modMarches, actConsulter],
      [modMarches, actCreer],
      [modMarches, actModifier],
      [modMarches, actValider],
      [modMarches, actSupprimer],
    ]) {
      await grant(moduleId, actionId);
    }
    console.log('Rôle + permissions OK.');

    const attribution = await ds.query(
      'select id from utilisateur_roles where utilisateur_id = $1 and role_id = $2',
      [userId, roleId],
    );
    if (!attribution[0]) {
      await ds.query('insert into utilisateur_roles (utilisateur_id, role_id, date_debut) values ($1, $2, current_date)', [
        userId,
        roleId,
      ]);
    }
    console.log('Attribution du rôle OK.');

    let workflowRows: Array<{ id: string }> = await ds.query(
      "select id from workflow_definitions where organisation_id = $1 and module_id = $2 and code = 'defaut'",
      [orgId, modCourrier],
    );
    const workflowDefId =
      workflowRows[0]?.id ??
      (
        await ds.query(
          `insert into workflow_definitions (organisation_id, module_id, code, libelle, est_defaut, actif)
           values ($1, $2, 'defaut', 'Workflow courrier par défaut', true, true) returning id`,
          [orgId, modCourrier],
        )
      )[0].id;

    const upsertEtape = async (code: string, libelle: string, typeEtape: string): Promise<string> => {
      const existing = await ds.query(
        'select id from workflow_etapes where workflow_definition_id = $1 and code = $2',
        [workflowDefId, code],
      );
      if (existing[0]) return existing[0].id;
      const inserted = await ds.query(
        'insert into workflow_etapes (workflow_definition_id, code, libelle, type_etape) values ($1, $2, $3, $4) returning id',
        [workflowDefId, code, libelle, typeEtape],
      );
      return inserted[0].id;
    };
    const etapeEnregistre = await upsertEtape('enregistre', 'Enregistré', 'initiale');
    const etapeTraite = await upsertEtape('traite', 'Traité', 'finale');

    const transitionExisting = await ds.query(
      'select id from workflow_transitions where workflow_definition_id = $1 and code = $2',
      [workflowDefId, 'traiter'],
    );
    if (!transitionExisting[0]) {
      await ds.query(
        `insert into workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
         values ($1, $2, $3, 'traiter', 'Traiter')`,
        [workflowDefId, etapeEnregistre, etapeTraite],
      );
    }
    console.log(`Workflow Courrier OK (définition ${workflowDefId}).`);

    let workflowGedRows: Array<{ id: string }> = await ds.query(
      "select id from workflow_definitions where organisation_id = $1 and module_id = $2 and code = 'defaut'",
      [orgId, modGed],
    );
    const workflowGedId =
      workflowGedRows[0]?.id ??
      (
        await ds.query(
          `insert into workflow_definitions (organisation_id, module_id, code, libelle, est_defaut, actif)
           values ($1, $2, 'defaut', 'Workflow GED par défaut', true, true) returning id`,
          [orgId, modGed],
        )
      )[0].id;

    const upsertEtapeGed = async (code: string, libelle: string, typeEtape: string): Promise<string> => {
      const existing = await ds.query(
        'select id from workflow_etapes where workflow_definition_id = $1 and code = $2',
        [workflowGedId, code],
      );
      if (existing[0]) return existing[0].id;
      const inserted = await ds.query(
        'insert into workflow_etapes (workflow_definition_id, code, libelle, type_etape) values ($1, $2, $3, $4) returning id',
        [workflowGedId, code, libelle, typeEtape],
      );
      return inserted[0].id;
    };
    // Étape codée 'archivage' : app.fn_rechercher_documents (explorateur Archives
    // GED) filtre strictement sur ce code, voir GedRechercheService.
    const etapeDepose = await upsertEtapeGed('depose', 'Déposé', 'initiale');
    const etapeArchivage = await upsertEtapeGed('archivage', 'Archivage', 'finale');

    const transitionGedExisting = await ds.query(
      'select id from workflow_transitions where workflow_definition_id = $1 and code = $2',
      [workflowGedId, 'archiver'],
    );
    if (!transitionGedExisting[0]) {
      await ds.query(
        `insert into workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
         values ($1, $2, $3, 'archiver', 'Archiver')`,
        [workflowGedId, etapeDepose, etapeArchivage],
      );
    }
    console.log(`Workflow GED OK (définition ${workflowGedId}).`);

    const regleExisting = await ds.query(
      `select id from regles_numerotation
       where organisation_id = $1 and module_id = $2 and entite_id is null and valeur_liste_id is null`,
      [orgId, modCourrier],
    );
    if (!regleExisting[0]) {
      await ds.query(
        `insert into regles_numerotation (organisation_id, module_id, format, sequence_courante, reinitialisation)
         values ($1, $2, 'COURRIER-{ANNEE}-{SEQ:4}', 0, 'annuelle')`,
        [orgId, modCourrier],
      );
    }
    console.log('Règle de numérotation OK.');

    let workflowMissionsRows: Array<{ id: string }> = await ds.query(
      "select id from workflow_definitions where organisation_id = $1 and module_id = $2 and code = 'defaut'",
      [orgId, modMissions],
    );
    const workflowMissionsId =
      workflowMissionsRows[0]?.id ??
      (
        await ds.query(
          `insert into workflow_definitions (organisation_id, module_id, code, libelle, est_defaut, actif)
           values ($1, $2, 'defaut', 'Workflow mission par défaut', true, true) returning id`,
          [orgId, modMissions],
        )
      )[0].id;

    const upsertEtapeMission = async (code: string, libelle: string, typeEtape: string): Promise<string> => {
      const existing = await ds.query(
        'select id from workflow_etapes where workflow_definition_id = $1 and code = $2',
        [workflowMissionsId, code],
      );
      if (existing[0]) return existing[0].id;
      const inserted = await ds.query(
        'insert into workflow_etapes (workflow_definition_id, code, libelle, type_etape) values ($1, $2, $3, $4) returning id',
        [workflowMissionsId, code, libelle, typeEtape],
      );
      return inserted[0].id;
    };
    const etapeCreation = await upsertEtapeMission('creation', 'Création', 'initiale');
    const etapeEnCours = await upsertEtapeMission('en-cours', 'Mission en cours', 'intermediaire');
    const etapeClotureMission = await upsertEtapeMission('cloture', 'Clôture', 'finale');

    const upsertTransitionMission = async (
      etapeSourceId: string,
      etapeCibleId: string,
      code: string,
      libelleAction: string,
    ) => {
      const existing = await ds.query(
        'select id from workflow_transitions where workflow_definition_id = $1 and code = $2',
        [workflowMissionsId, code],
      );
      if (existing[0]) return;
      await ds.query(
        `insert into workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
         values ($1, $2, $3, $4, $5)`,
        [workflowMissionsId, etapeSourceId, etapeCibleId, code, libelleAction],
      );
    };
    await upsertTransitionMission(etapeCreation, etapeEnCours, 'demarrer', 'Démarrer la mission');
    await upsertTransitionMission(etapeEnCours, etapeClotureMission, 'cloturer', 'Clôturer');
    console.log(`Workflow Missions OK (définition ${workflowMissionsId}).`);

    const regleMissionsExisting = await ds.query(
      `select id from regles_numerotation
       where organisation_id = $1 and module_id = $2 and entite_id is null and valeur_liste_id is null`,
      [orgId, modMissions],
    );
    if (!regleMissionsExisting[0]) {
      await ds.query(
        `insert into regles_numerotation (organisation_id, module_id, format, sequence_courante, reinitialisation)
         values ($1, $2, 'MIS-{ANNEE}-{SEQ:4}', 0, 'annuelle')`,
        [orgId, modMissions],
      );
    }
    console.log('Règle de numérotation Missions OK.');

    const setParametre = async (cle: string, valeur: unknown) => {
      const existing = await ds.query('select id from parametres_organisation where organisation_id = $1 and cle = $2', [
        orgId,
        cle,
      ]);
      if (existing[0]) {
        await ds.query('update parametres_organisation set valeur = $1 where id = $2', [
          JSON.stringify(valeur),
          existing[0].id,
        ]);
      } else {
        await ds.query('insert into parametres_organisation (organisation_id, cle, valeur) values ($1, $2, $3)', [
          orgId,
          cle,
          JSON.stringify(valeur),
        ]);
      }
    };
    await setParametre('courrier.entite_destinataire_initiale_id', entiteId);
    await setParametre('courrier.etape_apres_enregistrement_entrant_id', etapeTraite);
    console.log('Paramètres de routage Courrier OK.');

    // Référentiel Projets (0065/0072) : jamais seedé pour les organisations
    // créées après le replay des migrations (INSERT ... SELECT FROM
    // organisations, exécuté une seule fois au moment de la migration) — voir
    // MIGRATION.md Phase 5.
    const upsertListe = async (code: string, libelle: string): Promise<string> => {
      const existing: Array<{ id: string }> = await ds.query(
        'select id from listes_valeurs where organisation_id = $1 and code = $2',
        [orgId, code],
      );
      if (existing[0]) return existing[0].id;
      const inserted: Array<{ id: string }> = await ds.query(
        'insert into listes_valeurs (organisation_id, code, libelle, module_id) values ($1, $2, $3, $4) returning id',
        [orgId, code, libelle, modProjets],
      );
      return inserted[0].id;
    };
    const upsertValeur = async (listeId: string, code: string, libelle: string, ordre: number): Promise<string> => {
      const existing: Array<{ id: string }> = await ds.query(
        'select id from valeurs_listes where liste_id = $1 and code = $2',
        [listeId, code],
      );
      if (existing[0]) return existing[0].id;
      const inserted: Array<{ id: string }> = await ds.query(
        'insert into valeurs_listes (liste_id, code, libelle, ordre) values ($1, $2, $3, $4) returning id',
        [listeId, code, libelle, ordre],
      );
      return inserted[0].id;
    };

    const listeLivrableStatut = await upsertListe('livrable_statut', 'Statut de livrable');
    for (const [code, libelle, ordre] of [
      ['a-venir', 'À venir', 1],
      ['en-cours', 'En cours', 2],
      ['en-retard', 'En retard', 3],
      ['realise', 'Réalisé', 4],
      ['valide', 'Validé', 5],
      ['annule', 'Annulé', 6],
    ] as const) {
      await upsertValeur(listeLivrableStatut, code, libelle, ordre);
    }

    const listeProjetStatut = await upsertListe('projet_statut', 'Statut de projet');
    for (const [code, libelle, ordre] of [
      ['planifie', 'Planifié', 1],
      ['en-cours', 'En cours', 2],
      ['suspendu', 'Suspendu', 3],
      ['termine', 'Terminé', 4],
    ] as const) {
      await upsertValeur(listeProjetStatut, code, libelle, ordre);
    }

    const listeDocTypeProjet = await upsertListe('document_type_projet', 'Type de document (projet)');
    for (const [code, libelle, ordre] of [
      ['tdr', 'TDR', 1],
      ['contrat', 'Contrat', 2],
      ['ordre-service', 'Ordre de service', 3],
      ['autre', 'Autre', 4],
    ] as const) {
      await upsertValeur(listeDocTypeProjet, code, libelle, ordre);
    }
    console.log('Référentiel Projets OK.');

    console.log('\nSeed terminé.');
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
