# Migration Supabase → PostgreSQL direct (NestJS + TypeORM)

Statut global : **Phases 0 à 7 terminées** (squelette NestJS + TypeORM + Auth JWT ; administration complète ; moteur de workflow générique + référentiel ; Courrier complet avec stockage ; GED complète avec stockage/versioning et ACL par document/dossier ; Projets complet — cœur métier V3, sans workflow moteur générique ; Missions complet, avec workflow moteur générique ; Notifications + cron — détection de retards et envoi SMTP internalisés via `@nestjs/schedule`). Sous-système d'archivage annuel GED (0082, cross-module Courrier/Projets/Missions) différé. Phase 8 (Frontend : remplacement de `supabase-js` par un client HTTP) à démarrer — dernière phase.

## Contexte

Ce dépôt est une SPA Vite + React qui utilise `@supabase/supabase-js` comme backend
(BaaS) : auth, requêtes DB, storage, RPC vers ~50 fonctions PL/pgSQL. Il n'existe
actuellement **aucun serveur NestJS** dans ce dépôt — la logique métier vit dans
`supabase/migrations/` (82 fichiers SQL) et 3 Edge Functions Deno.

Décision utilisateur (2026-08-28) : le nouveau backend NestJS sera créé **dans ce
même repo** (probablement `/server`), le frontend existant sera adapté pour appeler
cette API au lieu de `supabase-js`.

## Inventaire (fait le 2026-08-28)

- **Tables** : 64 (voir `src/types/database.ts`)
- **Fonctions RPC (`fn_*`)** : ~50, logique métier en PL/pgSQL (workflow, statistiques,
  archivage GED, transitions courrier/mission/versement)
- **Fichiers frontend important supabase-js** : ~65 (services, hooks, contexts, config)
- **Storage** : 4 fichiers (organisations branding, GED documents, décharges courrier,
  pièces jointes courrier)
- **Edge Functions Deno** : `creer-utilisateur` (service_role → auth.admin.createUser),
  `detecter-retards-workflow` (cron horaire), `envoyer-notifications-email` (cron 5 min, SMTP)

## Décisions d'architecture (validées le 2026-08-28)

- [x] (a) Fonctions `fn_*` PL/pgSQL catégorisées (voir ci-dessous) : techniques → gardées
      en SQL ; sécurité/RLS → remplacées par Guards NestJS ; métier (~55 fonctions,
      cat. 3-8) → réécrites en services NestJS ; reporting/stats (cat. 9) → gardées en
      SQL, différables
- [x] (b) RLS désactivée, autorisation portée par des Guards NestJS
- [x] (c) Mots de passe existants migrés (hash bcrypt copiés depuis `auth.users` via
      `server/scripts/migrate-passwords.ts`) — pas de reset global
- [x] (d) Storage : disque local, hors du dossier de déploiement (VPS Windows Server,
      ~20 utilisateurs, pas de MinIO/S3)

### Catégorisation des fonctions PL/pgSQL (fait le 2026-08-28)

1. **Techniques (restent en SQL)** : `set_updated_at`, `fn_audit_trigger`,
   `set_entite_chemin`, `set_ged_dossier_chemin`, `sync_etape_cache`
2. **Sécurité/RLS (obsolètes → Guards/services NestJS)** : `current_organisation_id`,
   `current_entite_id`, `has_permission`, `fn_a_permission_directe`, `can_view_document`,
   `can_view_courrier`, `can_view_projet`, `can_view_mission`, `can_modifier_projet`,
   `can_modifier_mission`, `fn_est_responsable_hierarchique`
3. **Moteur de workflow générique (réécriture prioritaire)** : `fn_demarrer_workflow`,
   `fn_executer_transition`, `fn_candidat_satisfait_acteur`, `acteur_de_transition_autorise`,
   `fn_condition_satisfaite`, `fn_notifier_transition`, `fn_detecter_et_notifier_retards`,
   `fn_notifier_destinataires_courrier`, `fn_definir_workflow_defaut`
4. **Courrier** : `fn_creer_courrier`, `fn_executer_transition_courrier`, `fn_imputer_courrier`,
   `fn_deverrouiller_courrier`, `fn_ajouter_decharge_courrier`, `fn_entites_imputables`,
   `fn_entites_transmissibles`, `fn_personnes_transmissibles`, `fn_bannettes_courrier`
5. **GED** : `fn_creer_dossier_ged`, `fn_modifier_dossier_ged`, `fn_creer_document`,
   `fn_verser_version_document`, `fn_transitions_disponibles_document`,
   `fn_executer_transition_document`, `fn_octroyer_droit_document`, `fn_revoquer_droit_document`,
   `fn_octroyer_droit_dossier`, `fn_revoquer_droit_dossier`, `fn_creer_versement`,
   `fn_ajouter_document_versement`, `fn_soumettre_versement`, `fn_transitions_disponibles_versement`,
   `fn_executer_transition_versement`, `fn_classer_document`, `fn_rechercher_documents`,
   `fn_consulter_document`, `fn_telecharger_document`, `fn_creer_categorie_ged`,
   `fn_modifier_categorie_ged`, `fn_bannette_ged`, `archivage_get_or_create_dossier`,
   `fn_archivage_compter_eligibles`, `fn_archivage_preparer`, `fn_archivage_definir_selection`,
   `fn_archivage_confirmer`
6. **Projets** : `fn_verifier_cloture_projet`, `fn_demander_cloture_projet`,
   `fn_confirmer_cloture_projet`, `fn_rejeter_cloture_projet`, `fn_cloturer_livrable`,
   `fn_ajouter_document_projet`, `fn_recalculer_avancement_projet`,
   `fn_verifier_responsable_livrable`, `fn_verifier_decaissement`
7. **Missions** : `fn_creer_mission`, `fn_ajouter_document_mission`,
   `fn_transitions_disponibles_mission`, `fn_executer_transition_mission`,
   `fn_recalculer_budget_reel_mission`
8. **Admin/config** : `fn_definir_parametres_smtp`, `fn_generer_numero`,
   `fn_parametre_organisation`
9. **Reporting/statistiques (restent en SQL, différables)** : `fn_statistiques_courrier`,
   `fn_statistiques_projets`, `fn_statistiques_missions`, `fn_statistiques_ged`,
   `fn_echeances_prochaines`, `fn_historique_projet`, `fn_journal_audit_courrier`,
   `fn_livrables_projet`, `fn_compter_documents_par_dossier`

## Phases

| # | Module | Statut |
|---|---|---|
| 0 | Squelette NestJS + TypeORM + Auth JWT natif | **Fait** |
| 1 | Administration (organisations, entités, utilisateurs, rôles, permissions, fonctions, délégations, paramétrage) | **Fait** |
| 2 | Workflow / Référentiel (wrappers vers `fn_*`) | **Fait** (notifications/retards courrier différés, voir journal) |
| 3 | Courrier | **Fait**, y compris stockage pièces jointes/décharge |
| 4 | GED | **Fait**, y compris stockage/versioning ; archivage annuel (0082) différé — voir journal |
| 5 | Projets | **Fait**, cœur métier V3 uniquement (V1 phases/activites/taches et tables de suivi risques/problèmes/décisions/réunions/indicateurs différées, voir journal) |
| 6 | Missions | **Fait** |
| 7 | Notifications + cron (`@nestjs/schedule`) | **Fait** |
| 8 | Frontend : remplacement des ~65 fichiers `supabase-js` par un client HTTP | À faire |

## Journal

- 2026-08-28 : Inventaire des usages Supabase + plan de migration proposé. Confirmation
  que le projet est une SPA React (pas un backend NestJS existant) — décision prise de
  créer le backend NestJS dans ce même dépôt.
- 2026-08-28 : Catégorisation des ~100 définitions de fonctions PL/pgSQL (dédupliquées en
  ~65 fonctions distinctes après réécritures successives dans les migrations). Décisions
  a/b/c/d validées.
- 2026-08-28 : Phase 0 livrée — squelette NestJS (`server/`), config TypeORM (`server/config/`,
  `nest-cli.json`, `server/tsconfig.json`), module Auth JWT natif (`server/auth/`,
  `passport-jwt`, `bcryptjs`), Guard global (`JwtAuthGuard` + décorateur `@Public()`).
  Entités `Utilisateur`/`Role`/`UtilisateurRole` créées (nécessaires à l'auth — début de
  Phase 1). Migration TypeORM `AddPasswordHashToUtilisateurs` + script de bascule des hash
  bcrypt `server/scripts/migrate-passwords.ts` (lit `auth.users`, écrit
  `utilisateurs.password_hash`). `npx nest build` valide sans erreur ; `npm run migration:run`
  atteint bien Postgres (échec d'authentification avec les identifiants actuels du `.env`
  local — à vérifier côté utilisateur, pas un problème de code).
  Dépendances ajoutées : `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`,
  `@nestjs/schedule`, `reflect-metadata`, `rxjs`, `class-validator`, `class-transformer`,
  `bcryptjs` (préféré à `bcrypt` : pas de compilation native, plus sûr sur le VPS Windows
  Server cible) ; dev : `@nestjs/cli`, `ts-node`, `cross-env`, `@types/bcryptjs`,
  `@types/express`.
  Points d'attention notés pour la suite : `server/package.json` (`{"type":"commonjs"}`,
  copié dans `dist-server/` via l'asset `nest-cli.json`) contourne le `"type": "module"`
  du `package.json` racine — sans ça, le JS compilé (CommonJS) planterait au lancement.

- 2026-08-28 : Bootstrap de la base locale `sim_dgird` (Postgres 18 local, service Windows
  `postgresql-x64-18`) — n'existait pas du tout. Mot de passe `postgres` réinitialisé
  (bascule temporaire `pg_hba.conf` en `trust`, avec l'aide de l'utilisateur pour les
  redémarrages du service qui nécessitent des droits admin, puis restauration
  `scram-sha-256`). Stub minimal des schémas Supabase `auth`/`storage`/`extensions`
  (`auth.users`, `auth.uid()/role()/jwt()`, `storage.buckets`/`objects`,
  `storage.foldername()`, rôles `authenticated`/`anon`/`service_role`) pour pouvoir
  rejouer les 82 migrations telles quelles (RLS/policies incluses — désactivées plus tard
  en Phase 2, cf. décision b). Les 82 fichiers s'appliquent maintenant sans erreur ; 64
  tables créées. `npm run migration:run` (ajout `password_hash`) et `npx nest start`
  passent de bout en bout contre cette base. Ce stub `auth`/`storage` est local-only,
  hors du dépôt (pas dans `server/migrations/` ni `supabase/`) — n'a pas vocation à être
  rejoué contre la vraie base Supabase (là, `auth.users` existe déjà réellement, c'est
  justement lui que `migrate-passwords.ts` doit lire).

- 2026-08-28 : Audit de la Phase 1 — constat que tout le périmètre (entités, guard,
  services, contrôleurs CRUD administration) était en réalité déjà livré (travail non
  journalisé précédemment). `npx nest build` passe sans erreur. Vérification ciblée de
  `PermissionsGuard`/`AuthorizationService` contre le SQL original
  (`0004_fonctions_permissions.sql`, `0020_workflow_v2.sql`) : `has_permission`/
  `fn_a_permission_directe` et la logique de délégation (§9) sont fidèlement portées
  (même requête, mêmes portées `organisation`/`personnel`/`entite`/`entite_et_descendants`
  via `ltree @>`). `current_organisation_id`/`current_entite_id` remplacés par
  `AuthenticatedUser` (re-fetch utilisateur + vérif `statut='actif'` à chaque requête via
  `JwtStrategy.validate`). Tous les contrôleurs admin protégés par `PermissionsGuard` +
  `@RequirePermission`, codes module/action cohérents avec l'usage frontend existant
  (`src/modules/administration/audit/AuditTab.tsx`).
  Phase 1 déclarée **terminée**. Deux écarts mineurs assumés, à traiter plus tard :
  `organisation_branding` (vue SQL publique, pas une table) n'a pas encore d'endpoint
  public dédié ; `creer-utilisateur` n'a pas de route `/auth/creer-utilisateur` séparée
  mais est couvert par `POST /administration/utilisateurs` (déjà gardé par permission).
  `can_view_document/courrier/projet/mission`, `can_modifier_projet/mission` et
  `fn_est_responsable_hierarchique` (catégorie 2) restent à porter avec leurs modules
  respectifs (Phases 3-6), hors périmètre Phase 1.

- 2026-08-28 : Phase 2 livrée — moteur de workflow générique (`server/workflow/`).
  Entités TypeORM pour les 7 tables du référentiel (`WorkflowDefinition`, `WorkflowEtape`,
  `WorkflowTransition`, `WorkflowTransitionActeur` = `workflow_transition_roles`,
  `WorkflowDefinitionAssociation`, `WorkflowInstance`, `WorkflowHistorique`).
  `WorkflowService` : CRUD référentiel (définitions/étapes/transitions/acteurs/
  associations, avec revalidation en TS de la contrainte CHECK
  `workflow_transition_roles_type_ck`) + `definirDefaut` (portage transactionnel de
  `app.fn_definir_workflow_defaut`, 0045). `WorkflowEngineService` : portage fidèle de
  `app.fn_demarrer_workflow`, `app.fn_executer_transition` (transaction + `SELECT ...
  FOR UPDATE` sur `workflow_instances`, verrou nécessaire pour sérialiser des transitions
  concurrentes sur la même instance), `app.fn_candidat_satisfait_acteur` et
  `app.acteur_de_transition_autorise` (0005/0020_workflow_v2.sql) ; `fn_condition_satisfaite`
  portée en fonction pure (`condition.util.ts`). `WorkflowController` expose le CRUD
  référentiel sous `/administration/workflows/*` (lecture : `administration/consulter`,
  écriture : `administration/creer`|`modifier`, même convention que les contrôleurs
  Phase 1) ; `WorkflowEngineService` n'a volontairement pas d'endpoint HTTP propre —
  aucun module métier ne produit encore d'instance (voir écarts ci-dessous), il sera
  appelé en interne par Courrier/GED/Missions à partir de la Phase 3.
  `npx nest build` et `npx nest start` (contre la base locale) passent sans erreur,
  toutes les routes sont mappées.

  Décisions/écarts, documentés dans le code :
  - `app.fn_notifier_transition` (trigger `AFTER INSERT ON workflow_historique`) **n'est
    pas porté en TypeScript** — laissé comme trigger SQL vivant, par cohérence avec
    `app.sync_etape_cache` (catégorie 1, déjà "reste en SQL") : les deux réagissent au
    même événement (INSERT dans `workflow_historique`) et s'exécutent de toute façon pour
    tout INSERT émis par `WorkflowEngineService`, qu'il vienne de TypeORM ou non. Le
    porter en TS aurait dupliqué l'effet. Reclassé de facto catégorie 3 → catégorie 1 ;
    à signaler si l'utilisateur veut trancher autrement.
  - `app.fn_notifier_destinataires_courrier` et `app.fn_detecter_et_notifier_retards`
    (catégorie 3 dans le découpage initial) **ne sont pas portés** : les deux nécessitent
    les tables `courriers`/`courrier_destinataires` (et pour les retards, `ged_versements`/
    `missions`) pour résoudre l'objet porteur — aucune n'existe encore côté NestJS. À
    porter au moment de la Phase 3 (Courrier), en même temps que ses appelants
    (`fn_creer_courrier`, `fn_imputer_courrier`, `fn_ajouter_decharge_courrier`) plutôt
    que de re-belire ce SQL une seconde fois.
  - Lecture des instances/historique (`workflow_instances`/`workflow_historique`) :
    méthodes de service prêtes (`WorkflowEngineService.getInstance`/`listHistorique`)
    mais **pas d'endpoint HTTP** — la policy RLS d'origine (0014/0057) scope la visibilité
    via l'objet porteur (courrier/document/mission de la même organisation), impossible à
    reproduire fidèlement tant que ces tables n'existent pas côté NestJS ; exposer ces
    routes maintenant lirait n'importe quelle instance par id sans contrôle d'org. À
    ajouter en Phase 3 avec le vrai scoping.

- 2026-08-28 : Phase 3 livrée — cœur métier Courrier (`server/courrier/`, `server/notifications/`,
  `server/audit/`). Entités : `Courrier`, `CourrierDestinataire` (table
  `courrier_destinataires`), `CourrierDestinataireAction`, `Contact` ; `Notification`
  (nouveau module `server/notifications/`, générique, réutilisable par GED/Missions) ;
  `JournalAudit` (`server/common/entities/`, lecture seule — alimentée par le trigger SQL
  `app.fn_audit_trigger`, catégorie 1).

  `WorkflowEngineService` (Phase 2) retouché : `demarrerWorkflow`/`executerTransition`
  acceptent désormais un `EntityManager` optionnel pour composer dans la transaction de
  l'appelant (bug évité : les appeler depuis la transaction de `CourriersService.create`/
  `CourrierWorkflowService.imputerCourrier` sans ce changement aurait ouvert une
  **deuxième transaction sur une connexion distincte, non atomique** avec celle de
  l'appelant — un rollback de l'appelant n'aurait pas défait l'écriture workflow).
  `executerTransition` retourne maintenant l'id de la ligne `workflow_historique` créée
  (nécessaire à la corrélation `courrier_destinataires.workflow_historique_id`). Ajout de
  `transitionsDisponibles` (réutilisé par `fn_transitions_disponibles_courrier` et la
  bannette `'a_traiter'`).

  `ParametrageService.genererNumero` : portage de `app.fn_generer_numero` (0040), avec
  verrou `FOR UPDATE` sur la règle de numérotation, résolution récursive du chemin
  d'entité (CTE SQL, `{CHEMIN_ENTITE}`/`{ENTITE}`) et gestion des réinitialisations
  annuelle/mensuelle/jamais. `OrganisationsService.getParametre` ajouté (lecture d'un
  seul paramètre clé/valeur, utilisé pour le routage initial des courriers entrants et
  leur étape post-enregistrement).

  `CourriersService` : `canView`/`assertWritable` (portage de `app.can_view_courrier` et
  de la policy `courriers_update` 0037), `create` (portage de `app.fn_creer_courrier`,
  dernier corps 0054 — numérotation, démarrage de workflow, routage automatique des
  entrants via le paramètre d'organisation `courrier.etape_apres_enregistrement_entrant_id`,
  notification), `update`/`remove` (patch/suppression douce, champs alignés sur
  `CourrierPatchInfos` du frontend existant), `findBannette` (portage des 6 branches de
  `app.fn_bannettes_courrier`, dernier corps 0049), `notifierDestinatairesCourrier`
  (portage de `app.fn_notifier_destinataires_courrier`, 0053), `journalAuditCourrier`
  (portage de `app.fn_journal_audit_courrier`, 0035, diff calculé en JS plutôt qu'en SQL
  latéral). `CourrierWorkflowService` : `executerTransition`/`transitionsDisponibles`
  (portage de `app.fn_executer_transition_courrier` 0046 et
  `app.fn_transitions_disponibles_courrier` 0042), `imputerCourrier` (portage de
  `app.fn_imputer_courrier`, dernier corps 0054), `entitesImputables`/
  `entitesTransmissibles`/`personnesTransmissibles` (0034/0042/0044).

  **Deux régressions détectées dans le SQL de production actuel** (corps 0054, en
  vigueur depuis la dernière réécriture de `fn_imputer_courrier`), corrigées dans le
  port sur décision explicite de l'utilisateur (2026-08-28) plutôt que reproduites à
  l'identique :
  1. La distinction introduite en 0044 entre permission `'affecter'` (imputation/
     affectation) et `'transmettre'` (transmission/redirection) avait été silencieusement
     perdue en 0054 (retour à `'affecter'` pour tout type d'action) — un utilisateur
     n'ayant que `courrier/affecter` pouvait donc transmettre/rediriger un courrier.
     `CourrierWorkflowService.imputerCourrier` réintroduit la distinction.
  2. La corrélation `courrier_destinataires.workflow_historique_id` sur les destinataires
     en copie (introduite en 0043) était elle aussi perdue en 0054 (seul le destinataire
     principal était corrélé) — `listHistoriqueActions` côté frontend en a besoin pour les
     deux. Restaurée pour tous les destinataires créés par une imputation (principal,
     copies, personne réceptrice de l'entité).

  Écarts de périmètre assumés :
  - **Stockage (pièces jointes/décharge) différé** — décision utilisateur du 2026-08-28.
    `app.fn_ajouter_decharge_courrier` et `app.fn_deverrouiller_courrier` ne sont donc
    **pas portés** ; les colonnes `courriers.verrouille_le`/`verrouille_par` existent déjà
    dans l'entité (nécessaires à `assertWritable`) mais restent toujours `null` en
    pratique tant que la décharge n'est pas implémentée. Le flux actuel (upload direct
    vers Supabase Storage) devra être entièrement réécrit en upload multipart vers le
    serveur NestJS + disque local (décision d) — pas un simple remplacement de client.
  - `app.fn_detecter_et_notifier_retards` (boucle générique + boucle échéances courrier)
    reste différée à la Phase 7 (cron `@nestjs/schedule`) comme prévu par le plan
    d'origine — la logique métier est déjà entièrement documentée dans les notes de
    recherche de cette phase, à ne pas re-dériver.
  - L'association `workflow_definition_associations` par sens de courrier (câblée en
    0021) n'est **pas ressuscitée** : le corps final de `fn_creer_courrier` (depuis 0026)
    n'a jamais transmis de `p_valeur_liste_id` à `fn_demarrer_workflow` malgré ce câblage —
    code mort côté SQL d'origine, reproduit tel quel (pas de régression introduite, juste
    non comblé).
  - `GET /administration/journal-audit` (vue d'ensemble audit générique, hors périmètre
    Courrier strict) ajouté à moindre coût dans un petit module `server/audit/` dédié,
    l'entité `JournalAudit` étant de toute façon nécessaire à `journalAuditCourrier`.
  - Visibilité de liste (`findAll`, bannettes `'a_traiter'`/`'en_copie'`) : filtrage de
    canView appliqué en mémoire après chargement plutôt qu'inliné dans le SQL (qui
    demanderait de répliquer la sous-requête `has_permission` + délégations dans chaque
    requête de liste) — acceptable pour les volumes attendus (VPS mono-instance,
    ~20 utilisateurs par organisation), à revisiter si la volumétrie change.

  `npx nest build` et `npx nest start` (contre la base locale) passent sans erreur,
  toutes les routes sont mappées.

- 2026-08-29 : Test de bout en bout de la Phase 3 contre la base locale, serveur réel
  (`npx nest start`), sans mock. Ajout de `server/scripts/seed-dev.ts` (idempotent,
  usage : `npx ts-node -P server/tsconfig.json server/scripts/seed-dev.ts <code_org>
  <email_utilisateur>`) — seede modules/actions/permissions de base, une entité racine,
  un rôle "tout-organisation" attribué à l'utilisateur donné, un workflow Courrier à 2
  étapes (Enregistré -> Traité) avec une transition, une règle de numérotation et les
  paramètres de routage des courriers entrants. Complète la base locale déjà amorcée
  (organisation `TEST` + utilisateur `admin.test@example.com`, créés lors du bootstrap
  Phase 0) qui n'avait aucune donnée de référentiel (modules/actions/rôles vides).

  20 appels HTTP exercés avec un JWT signé directement (même charge utile que
  `AuthService.login`, sans avoir à connaître le mot de passe de l'utilisateur seed) :
  création courrier sortant (numérotation `COURRIER-2026-0001`, démarrage de workflow),
  lecture des transitions disponibles, exécution d'une transition (bascule d'étape,
  passage `en_cours` -> `terminee`, entrée d'historique), lecture de l'historique et de
  l'instance, bannette `archives` (contient bien le courrier clôturé), création d'un
  courrier entrant sans `entiteId` (résolution automatique via le paramètre
  `courrier.entite_destinataire_initiale_id` + avance automatique vers l'étape
  configurée via `courrier.etape_apres_enregistrement_entrant_id`, avec entrée
  d'historique dédiée), imputation (création du destinataire principal, notification),
  liste des destinataires, audit par courrier et audit générique, contacts, ajout direct
  d'un destinataire en copie, entités imputables/transmissibles/personnes
  transmissibles, mise à jour directe, bannette `a_traiter` (vide, comme attendu — les
  deux courriers de test sont déjà clôturés), suppression douce (courrier toujours
  lisible par id avec `supprimeLe` renseigné, mais absent de la liste). **0 échec.**

  Cas limites vérifiés séparément : requête sans JWT -> 401 ; `sens` invalide -> 400
  (validation `class-validator`) ; imputation avec `typeAction` sur un courrier
  `sortant` -> 400 ("réservé aux courriers entrants") ; transition avec un id inexistant
  -> 404 ; courrier inexistant -> 404.

  Vérification directe en base : le trigger SQL `app.fn_audit_trigger` (catégorie 1)
  se déclenche bien pour les écritures faites via TypeORM (confirmé par les lignes
  `journal_audit` générées à l'INSERT et à chaque UPDATE d'un courrier, sans code
  applicatif dédié). `notifierDestinatairesCourrier` a d'abord semblé ne rien insérer
  (0 ligne dans `notifications`) — en fait correct : le seul utilisateur de test jouait
  à la fois le rôle de créateur, de responsable de l'entité et d'agent affecté, donc
  chaque notification était auto-exclue (`excludeUserId`). Reproduit avec un deuxième
  utilisateur de test en `personne_receptrice` de l'entité : la notification est bien
  générée pour lui et lui seul.

  Aucun bug de logique métier trouvé pendant ce test — uniquement des ajustements
  d'outillage de test (utilisateurs locaux liés à la table `auth.users` du stub Supabase
  local, `id` sans défaut généré côté SQL pour `utilisateurs`).

- 2026-08-29 : Stockage pièces jointes/décharge (dernier morceau différé de la Phase 3)
  livré et testé en réel. Entité `CourrierPieceJointe` (`courrier_pieces_jointes`,
  `document_id`/`hash_sha256` non utilisés — cf. rapport de recherche Courrier : lien
  croisé GED différé à la Phase 4, hachage jamais renseigné par aucune des 9 fonctions
  d'origine). `server/config/storage.config.ts` : racine de stockage pilotée par
  `STORAGE_ROOT` (chemin absolu, doit être hors du dossier de déploiement en production —
  décision d), défaut local `./storage` à la racine du dépôt (ajouté au `.gitignore`,
  entrée ajoutée à `.env.example`). Ajout de `@types/multer` en devDependency
  (`@nestjs/platform-express`/multer étaient déjà présents en dépendance transitive).

  `CourrierStorageService` : upload en mémoire (`multer.memoryStorage()`, limite 25 Mo)
  puis écriture disque (`{courrier_id}/{uuid}-{nom_fichier_assaini}`, même convention que
  l'ancien bucket Supabase Storage mais chemin relatif à `STORAGE_ROOT`) ; toute lecture
  par `storagePath` revalide que le chemin résolu reste sous `STORAGE_ROOT` (défense en
  profondeur contre la traversée de répertoire, bien que `storagePath` ne soit jamais
  fourni par le client). Téléchargement : plus d'équivalent à `createSignedUrl` (TTL 60s)
  en disque local — remplacé par un endpoint authentifié qui revérifie `canView` à chaque
  requête (`GET /courrier/pieces-jointes/:id/telecharger`, `res.download()`). Portage de
  `app.fn_ajouter_decharge_courrier` (0054, `ajouterDecharge` : verrouille le courrier,
  clôture le workflow si `sens='sortant'` et instance `en_cours`, entrée d'historique
  synthétique "même étape", notification) et `app.fn_deverrouiller_courrier` (0047,
  `deverrouiller` : motif obligatoire, entrée `journal_audit` manuelle contournant
  volontairement le trigger générique, réouverture de l'instance de workflow si elle
  avait été clôturée par la décharge).

  **Bug réel trouvé et corrigé pendant le test en réel** (pas repéré à la relecture ni au
  build) : `manager.query()` sur une requête `UPDATE ... RETURNING` renvoie, avec la
  version de TypeORM installée (1.1.0), le tuple `[lignes, nombre de lignes affectées]`
  — alors qu'`INSERT ... RETURNING` et un `SELECT` renvoient directement le tableau de
  lignes (vérifié empiriquement les deux cas pour confirmer que seuls UPDATE/DELETE sont
  concernés). Le code de `ajouterDecharge` traitait `rows[0]` comme la première ligne ;
  en réalité `rows[0]` était le tableau de lignes lui-même, donc `.etape_courante_id`
  valait toujours `undefined` — la clôture du workflow (statut + `termine_le`)
  fonctionnait quand même (faite par un `manager.update()` séparé), mais l'entrée
  d'historique "Décharge ajoutée" et la notification de clôture étaient silencieusement
  sautées, sans aucune erreur. Repéré uniquement parce que le test en réel vérifiait le
  contenu de l'historique après décharge, pas seulement les codes HTTP. Corrigé par
  déstructuration `const [rows] = await manager.query(...)`, avec un commentaire dans le
  code pour éviter la récidive. **Aucune autre occurrence** de ce pattern (`UPDATE ...
  RETURNING` via `.query()`) trouvée ailleurs dans le code déjà écrit (Phases 1-3) — le
  seul autre point sensible (`WorkflowEngineService.executerTransition`) utilise un
  `SELECT ... FOR UPDATE`, non concerné.

  17 vérifications HTTP + inspection DB directe, 0 échec après correction : upload/liste/
  téléchargement/suppression d'une pièce jointe normale (contenu, `Content-Disposition`,
  présence/absence sur disque) ; décharge refusée sur un courrier entrant (400) ; décharge
  sur un courrier sortant (verrouillage, clôture du workflow, entrée d'historique,
  notification — vérifiés directement en base) ; écriture bloquée sur un courrier
  verrouillé (409) ; déverrouillage refusé sans motif (400) puis accepté avec motif
  (workflow rouvert, écriture de nouveau possible) ; nom de fichier contenant `../../../`
  correctement assaini (chemin résolu toujours sous `STORAGE_ROOT`, jamais planté).

  `npx nest build` et test en conditions réelles passent. `seed-dev.ts` complété (action
  `deverrouiller` accordée au rôle de test) pour permettre ce test.

- 2026-08-29 : Phase 4 (GED) livrée et testée en réel — `server/ged/`. Entités : `GedDossier`
  (plan de classement hiérarchique, `chemin`/`niveau` maintenus par le trigger SQL
  `app.set_ged_dossier_chemin`, catégorie 1, même limite connue que `entites.chemin` :
  déplacer un sous-arbre ne recalcule pas récursivement le chemin des descendants),
  `Document`, `DocumentVersion` (vrai versioning multi-fichiers, contrairement à
  Courrier — chaque version pointe vers un fichier physique distinct, jamais écrasé),
  `DocumentDroit`/`DossierDroit` (ACL par objet), `GedVersement` (porte le workflow,
  déplacé hors de `documents` en 0057, l'équivalent GED d'un courrier), `GedConsultation`
  (journal d'accès en lecture seule). Table `ged_categories` volontairement **pas
  portée** : vestigiale, plus aucune fonction ne la lit/l'écrit depuis 0062.

  `GedDocumentsService.canView` : portage fidèle de `app.can_view_document` (0057,
  dernier corps) — le point le plus délicat de cette phase, seule différence
  structurelle majeure avec Courrier (qui n'a aucune ACL par objet) : créateur toujours
  visible ; sinon `hasPermission('ged','consulter',entiteId)` sauf si le document est
  marqué confidentialité `'secrete'` ; sinon droit direct via `document_droits` (match
  utilisateur direct, entité courante, ou **n'importe quel rôle actif détenu** — non
  scopé par la portée de l'attribution, contrairement à `AuthorizationService`) ;
  **`secrete` coupe court sans repli vers le dossier parent** — un droit direct sur le
  document passe outre `secrete`, un droit hérité du dossier seul ne le peut pas
  (asymétrie volontaire, vérifiée empiriquement, voir tests ci-dessous). `document_droits`/
  `dossier_droits` ne portent aujourd'hui que l'action `'consulter'` en pratique : la
  contrainte SQL n'empêche pas d'octroyer un droit `'modifier'`, mais aucune fonction
  source ne le lit — capacité morte par omission, non comblée (fidélité au SQL d'origine).

  `GedVersementsService`/`GedWorkflowService` : portage de `app.fn_creer_versement`
  (pas de workflow démarré à la création, contrairement à `fn_creer_courrier` — la GED a
  une vraie phase brouillon sans workflow), `app.fn_soumettre_versement` (verrou `FOR
  UPDATE`, `WorkflowEngineService.demarrerWorkflow` composé dans la même transaction via
  le paramètre `manager`, rejet si 0 document), `app.fn_transitions_disponibles_versement`
  (garde `'consulter'`, pas `'modifier'` — lister les actions possibles n'autorise pas à
  les exécuter, `WorkflowEngineService` fait cette vérification par transition),
  `app.fn_executer_transition_versement` (**délègue entièrement** à
  `WorkflowEngineService.executerTransition` sans aucune vérification supplémentaire,
  contrairement à l'équivalent Courrier plus gardé — différence de conception assumée
  côté source, reproduite telle quelle, pas une régression), `app.fn_bannette_ged`.
  `ged-versement-contexte.util.ts` ajouté, miroir de `courrier-contexte.util.ts`, pour
  l'évaluation des conditions de transition (clés SQL snake_case, pas les propriétés
  camelCase de l'entité TypeORM).

  `GedStorageService` : reprend le schéma disque de `CourrierStorageService` (upload en
  mémoire, écriture sous `STORAGE_ROOT/ged/...`, défense anti-traversée de répertoire)
  sous un préfixe séparé. Deux différences réelles avec Courrier, pas de simple
  copier-coller : (1) le téléchargement est paramétré par **id de version**, pas par id
  de document — GED garde tout l'historique des fichiers, il faut pouvoir télécharger une
  version antérieure ; (2) `verserVersion` calcule `version_majeure = max(...)+1` **sans
  verrou `FOR UPDATE`**, fidèle à `fn_verser_version_document` — une course concurrente
  sur le même document peut faire échouer un insert sur la contrainte unique
  `(document_id, version_majeure, version_mineure)` plutôt que d'être absorbée
  silencieusement ; reproduit tel quel (bug mineur pré-existant côté SQL, pas corrigé,
  contrairement au bug `transmettre`/`affecter` de Courrier qui avait été jugé plus
  sérieux). `creerDocumentAvecFichier` compose `fn_ajouter_document_versement` +
  `fn_verser_version_document` avec le même repli "supprime le document orphelin si
  l'upload échoue" que le frontend actuel.

  `GedDroitsService.validerCible` et `GedRechercheService` : le SQL d'origine ne valide
  jamais côté application qu'un droit référence exactement une cible (rôle/utilisateur/
  entité) — laisse la contrainte CHECK échouer telle quelle ; validation ajoutée ici pour
  un message d'erreur plus clair (amélioration mineure assumée, comme pour
  `WorkflowService.validerActeur` en Phase 2). `GedRechercheService` (portage de
  `app.fn_rechercher_documents`, l'explorateur "Archives" GED) filtre strictement sur
  `versement.etapeCode = 'archivage'` — **à ne pas confondre** avec le sous-système
  d'archivage annuel Courrier/Projets/Missions (0082, différé, voir ci-dessous) : deux
  fonctionnalités "archives" distinctes qui partagent juste le mot.

  **Différé** : le sous-système `archivage_operations`/`archivage_elements` (0082 —
  `fn_archivage_compter_eligibles`/`preparer`/`definir_selection`/`confirmer`, la
  campagne annuelle de classement des courriers/projets/missions clôturés dans le plan
  de classement GED). Décision assumée sans repasser par l'utilisateur, par analogie
  directe avec la séquence déjà validée sur Courrier (cœur métier d'abord, sous-système
  annexe ensuite) : c'est le plus gros morceau isolable de cette phase, il dépend en
  lecture des tables Projets/Missions (existent en SQL, aucune entité NestJS encore —
  Phases 5/6), et sa branche Courrier est la seule testable de bout en bout aujourd'hui.
  À reprendre soit avec la Phase 5/6, soit en évoquant explicitement le rapport de
  recherche déjà produit (contient le détail complet des 4 fonctions + le helper
  `archivageGetOrCreateDossier`) pour ne pas re-lire ce SQL une seconde fois.

  25 vérifications HTTP + 7 vérifications ciblées sur la confidentialité, 0 échec,
  contre le serveur réel et la base locale (aucun bug trouvé cette fois, contrairement
  au stockage Courrier) : dossier (créer/lister), versement (créer, refus de soumission
  à vide, soumission), document créé avec fichier en une seule requête multipart,
  listage, version supplémentaire (numérotation majeure incrémentée correctement),
  téléchargement par id de version (contenu exact), classement (repli 3 niveaux vérifié :
  cible explicite -> `dossierCibleId` du versement -> inchangé), traçabilité de
  consultation, ACL complète (utilisateur sans droit -> 404, droit direct accordé -> 200,
  droit révoqué -> 404 de nouveau), workflow (aucune transition avant soumission, la
  bonne après, bannette "à traiter" correcte, exécution de la transition, historique),
  recherche Archives (ne trouve le document qu'une fois l'étape `archivage` atteinte),
  modification directe. Cas confidentialité `'secrete'` vérifié séparément : bloqué sans
  droit ; un droit direct sur le document passe outre `secrete` ; un droit hérité du
  dossier seul ne le peut pas — les deux comportements exacts prédits par la lecture du
  SQL, confirmés empiriquement du premier coup.

  `seed-dev.ts` complété : module `ged`, actions `archiver`/`valider` (utiles dès
  maintenant pour la permission de test, même si le sous-système d'archivage qui les
  consomme est différé), workflow GED par défaut à 2 étapes (`depose` -> `archivage`,
  cette dernière codée ainsi délibérément pour que `GedRechercheService` ait quelque
  chose à trouver).

- 2026-08-29 : Phase 5 (Projets) livrée et testée en réel — `server/projets/`. Périmètre
  : cœur métier V3 (`projets`, `projet_membres`, `livrables`, `avenants`,
  `avenant_livrables`, `projet_contacts_execution`, `decaissements`,
  `projet_visibilite_entites`, `projet_visibilite_utilisateurs`) + l'endpoint générique de
  dépôt de document projet (portage de `app.fn_ajouter_document_projet`, réutilisant le
  stockage GED existant).

  **Écart de périmètre assumé, décidé sans repasser par l'utilisateur** (par analogie
  avec les écarts déjà validés en Phases 3/4) : les tables `phases`/`activites`/`taches`
  (V1, 0010) et les tables de suivi `projet_risques`/`projet_problemes`/
  `projet_decisions`/`projet_reunions`/`projet_reunion_participants`/
  `projet_indicateurs` (V1, jamais reprises par V2/V3) **ne sont pas portées**. Vérifié
  empiriquement (`grep` sur `src/`) qu'aucun hook/service/composant frontend n'y touche
  — même statut que `ged_categories` en Phase 4 (dead code applicatif, confirmé par le
  commentaire de tête de 0072 : "les tables phases/activites/taches restent en base...
  mais ne sont plus référencées par l'application à partir de cette version"). Ces
  tables restent en base, intactes, rejouables si l'utilisateur veut un jour les
  ressusciter — mais aucune route/entité NestJS ne les expose.

  **Reclassification de catégorie** (comme `fn_notifier_transition` en Phase 2) :
  `app.fn_recalculer_avancement_projet`, `app.fn_verifier_responsable_livrable` et
  `app.fn_verifier_decaissement` (catégorie 6 dans le découpage initial de
  MIGRATION.md) sont en réalité des fonctions de **trigger** (`trg_livrables_
  recalcule_avancement`, `trg_livrables_verifier_responsable`,
  `trg_decaissements_verifier`), jamais appelées en RPC directe par le frontend
  (vérifié par `grep` — seuls des commentaires y font référence). Reclassées de facto
  catégorie 6 → catégorie 1 : laissées vivre en SQL, elles se déclenchent
  automatiquement sur toute écriture TypeORM sur `livrables`/`decaissements`, sans code
  applicatif dédié (même mécanisme que `app.fn_audit_trigger`, confirmé empiriquement
  ci-dessous). `LivrablesService`/`DecaissementsService` dupliquent néanmoins la
  validation en TypeScript (membre actif / contact du projet ; cumul pourcentage/montant
  par origine) pour renvoyer un message 400 clair avant de toucher la base plutôt que de
  laisser remonter l'erreur PL/pgSQL brute — le trigger SQL reste le filet de sécurité
  final, pas dupliqué pour rien.

  `ProjetsService` : `canView`/`canModifier` (portage de `app.can_view_projet` 0071
  dernier corps — la branche `sponsor_id` a été retirée par 0069/0071 au profit du champ
  texte libre `financement`, sans équivalent d'accès privilégié — et `app.can_modifier_
  projet` 0066), `estResponsableHierarchique` (`app.fn_est_responsable_hierarchique`,
  remontée récursive `parent_entite_id`), CRUD projet, `verifierCloture`/
  `demanderCloture`/`confirmerCloture`/`rejeterCloture` (workflow de clôture à 2 niveaux,
  0066/0073 dernier corps — poids des livrables à 100% requis, tous réalisés/validés/
  annulés, justificatif obligatoire sur les réalisés ; étape 2 réservée au responsable du
  projet ; étape 3 réservée au responsable hiérarchique de l'entité porteuse ou à la
  permission `projets/valider`), `historique` (`app.fn_historique_projet`, dernier corps
  0073 — plus de branches phases/activites/taches, mortes depuis V3). Contrairement à
  Courrier/GED, **aucun couplage au moteur de workflow générique** : le SQL d'origine ne
  démarre jamais de `workflow_instance` pour un projet (le champ `livrables.
  workflow_instance_id` existe en base mais n'est référencé par aucune fonction depuis
  V1/V2 — colonne morte, mappée pour fidélité de schéma seulement).

  Politique de suppression (`projets_delete`, 0016) jamais retouchée par V2/V3 :
  réservée à la permission `projets/supprimer`, indépendamment de responsable/membre —
  reproduite telle quelle dans `ProjetsService.remove`.

  `LivrablesService` : CRUD + `cloturer` (portage de `app.fn_cloturer_livrable`, dernier
  corps 0073 — `projet_id` direct, plus de join `activite`/`phase` ; refuse la clôture
  sans document justificatif). Le responsable du livrable garde la main dessus même sans
  droit d'écriture global sur le projet (`livrables_write`, 0074).

  `AvenantsService` : CRUD avenants + livrables impactés (`avenant_livrables`, avec un
  endpoint `PUT` "remplacer l'ensemble" en plus d'ajout/retrait unitaire — même patron
  que `ProjetVisibiliteService`).

  `DecaissementsService.creerAvecJustificatif` : portage de la séquence "créer la ligne
  `decaissements` d'abord (pour obtenir son id) puis déposer le justificatif via
  `p_decaissement_id`, rollback (suppression du décaissement) si l'upload échoue" du
  frontend actuel (`services/projets/decaissements.ts`) — même patron que
  `ProjetsDocumentsService.ajouterDocumentAvecFichier` et `GedStorageService.
  creerDocumentAvecFichier`. Validation de cumul par origine (`app.fn_verifier_
  decaissement`, dernier corps 0075 : cumul distinct par `avenant_id`, ou pour le
  contrat d'origine si `avenant_id` est nul, plafonné par `avenants.montant` ou
  `projets.budget_prevu` respectivement).

  `ProjetsDocumentsService` : portage de `app.fn_ajouter_document_projet` (dernier corps
  0073, avec `p_decaissement_id`) — insère directement dans `documents` en bypassant la
  permission GED classique (`ged/creer`), gardé par `can_modifier_projet` comme le SQL
  d'origine. Réutilise `GedStorageService.verserVersion` **tel quel** (Phase 4, aucune
  modification) pour l'upload du fichier : le document vient d'être créé par
  l'appelant (`created_by = user.id`), donc son `canView`/`assertModifiable` passent
  sans changement. `GedStorageService` exporté par `GedModule` (n'était pas exporté en
  Phase 4, faute de consommateur externe) pour permettre cette réutilisation
  cross-module.

  **Extension délibérée d'un service déjà livré (Phase 4)**, pas une simple lecture :
  `GedDocumentsService.canView` ne portait que `app.can_view_document` dans son corps
  0057 (Phase 4 précédait Projets, la branche `projet_id` de 0066 n'existait pas encore
  côté NestJS). Ajoutée maintenant (dupliquée en SQL brut plutôt que par dépendance vers
  `ProjetsModule`, pour éviter un import circulaire — `ProjetsModule` dépend déjà de
  `GedModule` pour `Document`/`GedStorageService`) : un document rattaché à un projet
  hérite désormais de sa visibilité, en plus des voies d'accès GED classiques. **Bug réel
  trouvé dans le SQL de production en écrivant cette extension** : le corps 0066 de
  `app.can_view_document` (et sa reprise à l'identique par 0077 pour `mission_id`) a
  **silencieusement perdu la coupure de confidentialité `secrete`** introduite en
  0057/0058 — la branche `projet_id`/`mission_id` accorde l'accès sans jamais vérifier
  `confidentialite_valeur_id`, et pire, elle est placée *avant* toute logique de
  confidentialité dans le corps 0066/0077 (qui n'en a simplement plus). Comme pour la
  régression `affecter`/`transmettre` de Courrier (Phase 3) et l'asymétrie `secrete` déjà
  correctement implémentée en Phase 4, **décision assumée de corriger plutôt que
  reproduire** : la branche `projet_id` ajoutée ici est gardée par `!estSecrete`, au même
  titre que la permission `ged/consulter` juste au-dessus dans le code déjà existant. En
  pratique sans impact observable aujourd'hui (aucune des fonctions de création de
  document projet ne renseigne jamais `confidentialite_valeur_id`), mais corrige le
  comportement pour le jour où un document projet serait reclassé confidentiel via
  `GedDocumentsService.modifierDocument`.

  `seed-dev.ts` complété : module `projets`, action `supprimer` (manquait globalement,
  nécessaire à `ProjetsService.remove`), permissions `consulter`/`creer`/`modifier`/
  `valider`/`supprimer`, et **référentiel `listes_valeurs`/`valeurs_listes`** pour
  `livrable_statut`/`projet_statut`/`document_type_projet` — jamais seedé pour
  l'organisation `TEST` car les migrations 0065/0072 ne l'ont inséré que pour les
  organisations déjà existantes *au moment du replay des migrations* (avant même la
  création de `TEST`, faite après coup lors du bootstrap Phase 0). Sans ce complément,
  impossible de tester `fn_cloturer_livrable`/`confirmerCloture` en réel.

  **Bug réel trouvé et corrigé pendant le test en réel** (pas au build ni à la
  relecture) : `ProjetsService.create` ne renseignait pas explicitement `avancementPct`/
  `clotureStatut` dans l'objet passé à `create()`, comptant sur les défauts SQL (`0`/
  `'aucune'`) — contrairement à la convention déjà suivie partout ailleurs dans le code
  (Courrier renseigne explicitement chaque colonne à défaut SQL, jamais par omission).
  Résultat : ces deux colonnes étaient bien écrites en base (defaults SQL appliqués) mais
  **absentes de l'objet JSON retourné par l'API** juste après la création (TypeORM ne
  réhydrate que les colonnes explicitement fournies ou marquées `@CreateDateColumn`/
  générées — pas un simple défaut SQL sans métadonnée `default:` côté entité). Repéré en
  inspectant la réponse de `POST /projets` pendant le test, pas par la simple lecture du
  code. Corrigé en renseignant `avancementPct: '0'` et `clotureStatut: 'aucune'`
  explicitement — aligné sur la convention Courrier.

  **Second écart assumé pendant le test** (pas un bug bloquant, une lacune UX) : la
  contrainte unique `(organisation_id, code)` sur `projets` remontait en 500 brut sur
  doublon, alors que `code` est un champ saisi à la main par l'utilisateur (contrairement
  au numéro auto-généré de Courrier, qui ne peut pas entrer en collision) — donc un cas
  d'erreur bien plus probable en usage réel. Ajout d'une traduction ciblée
  (`code Postgres '23505'` → `409 ConflictException`) dans `ProjetsService.create`/
  `update`, sans introduire de mécanisme générique de traduction d'erreurs SQL
  (aucun précédent dans le code déjà écrit, portée volontairement limitée à ce seul
  point d'écriture).

  30+ vérifications HTTP + inspection DB directe, 0 échec après les deux corrections
  ci-dessus, contre le serveur réel et la base locale : CRUD projet ; visibilité `membres`
  (403/404 pour un non-membre, 200 après ajout, lecture seule pour un membre
  `peut_modifier=false`) ; visibilité `agents` (`projet_visibilite_utilisateurs`, 404 puis
  200 après ajout) ; validation `fn_verifier_responsable_livrable` (responsable non-membre
  refusé, contact hors-projet refusé, les deux avec message clair) ; recalcul automatique
  de `projets.avancement_pct` par le trigger SQL après clôture de livrable (60% puis 100%
  — confirmé sans aucun code applicatif de recalcul) ; clôture de livrable refusée sans
  justificatif (400) puis acceptée avec (200) ; visibilité d'un document projet pour un
  membre non-créateur (confirmation directe de l'extension `GedDocumentsService.canView`
  ci-dessus) ; avenant + livrable impacté ; décaissement avec justificatif obligatoire,
  cumul de pourcentage refusé au-delà de 100% avec rollback vérifié (le décaissement
  refusé n'apparaît pas dans la liste) ; workflow de clôture complet (checklist bloquante
  tant que les livrables ne sont pas tous réalisés/validés, demande réservée au
  responsable, rejet/confirmation réservés au responsable hiérarchique — 403 pour un
  utilisateur tiers, 200 pour le responsable d'entité — statut `projet_statut/termine`
  posé à la confirmation, projet en lecture seule ensuite) ; historique agrégeant tous les
  objets du graphe (projet, livrables, membres, avenants, documents, décaissements,
  contacts d'exécution) dans le bon ordre ; suppression de projet gardée par la
  permission `projets/supprimer` ; 404 sur projet/avenant/décaissement inexistant ; 409 sur
  code de projet dupliqué.

- 2026-08-29 : Phase 6 (Missions) livrée et testée en réel — `server/missions/`. Entités :
  `Mission`, `MissionParticipant`, `MissionActionSuivi`, `MissionDepense` (0011, schéma
  d'origine, pas de réécriture ultérieure du schéma contrairement aux fonctions).
  Contrairement à Projets (workflow de clôture maison, sans moteur générique), Missions
  utilise le moteur `WorkflowEngineService` de la Phase 2 comme Courrier/GED —
  `fn_creer_mission` (0077, dernier corps) compose `ParametrageService.genererNumero` +
  `WorkflowEngineService.demarrerWorkflow` dans une seule transaction, même patron que
  `CourriersService.create` (Phase 3). `MissionsWorkflowService` porte
  `fn_transitions_disponibles_mission`/`fn_executer_transition_mission` (0077) : même
  niveau de garde explicite que Courrier (revérifie `can_view_mission` et la présence
  d'une instance de workflow avant de déléguer), plus gardé que l'équivalent GED
  (`fn_executer_transition_versement`, entièrement délégué) — différence de conception
  du SQL source, reproduite fidèlement, pas une régression.

  `app.can_view_mission`/`app.can_modifier_mission` (0016/0077) portés dans
  `MissionsService` : visibilité via entité courante, responsable, permission
  `missions/consulter` ou participation (`mission_participants`, sans condition de date
  contrairement à `projet_membres.date_retrait`) ; modification via responsable ou
  permission `missions/modifier` uniquement — pas de notion de "membre contributeur"
  comme sur Projets, la table `mission_participants` n'a pas de colonne équivalente à
  `peut_modifier`. `fn_est_responsable_hierarchique` n'est pas concerné par Missions
  (jamais appelé par `can_modifier_mission`, contrairement à Projets) — aucun portage
  supplémentaire nécessaire ici.

  `app.fn_recalculer_budget_reel_mission` (catégorisée Missions dans le découpage
  d'origine) **n'est pas portée en TypeScript** : c'est en réalité un trigger SQL vivant
  (`app.trg_mission_depenses_recalcule_budget`, posé par 0077) qui se déclenche pour tout
  INSERT/UPDATE/DELETE sur `mission_depenses`, y compris ceux émis par TypeORM — reclassée
  de facto catégorie 7 → catégorie 1, même raisonnement déjà appliqué à
  `app.sync_etape_cache` en Phase 2. Confirmé empiriquement : `budget_reel` passe de
  `null` à la somme exacte des dépenses après chaque insertion, sans aucun code
  applicatif de recalcul.

  `MissionsDocumentsService` porte `app.fn_ajouter_document_mission` (0077, les 4 rôles
  `ordre_mission`/`compte_rendu`/`pv`/`depense`), même patron que
  `ProjetsDocumentsService` (Phase 5) : bypasse la permission GED classique
  (`can_modifier_mission` suffit), réutilise `GedStorageService.verserVersion` avec le
  même repli "supprime le document orphelin si l'upload échoue". Complète
  `GedDocumentsService.canView` avec une branche `missionId` symétrique à la branche
  `projetId` existante (dupliquant `app.can_view_mission` en SQL brut, même raison
  qu'évoquée pour `peutVoirProjet` : éviter un import circulaire GedModule/MissionsModule)
  — gatée par `!estSecrete` pour la même raison que la branche projet (voir la note sur
  la régression 0066/0077 dans le journal Phase 5) : confirmé qu'un document `secrete`
  rattaché à une mission reste invisible pour un participant sans droit direct, alors
  qu'il restait visible pour le créateur.

  **Bug réel trouvé et corrigé pendant le test en réel** : créer une mission avec un
  `entiteId` inexistant passait la vérification `hasPermission('missions','creer',...)`
  (portée `organisation` du rôle de test, qui ne valide pas l'existence de l'entité) puis
  remontait en `500` brut sur la violation de contrainte FK `missions.entite_id` au moment
  de l'insertion — repéré uniquement parce que le test exerçait délibérément ce cas
  limite, pas par la lecture du code. Corrigé par une vérification d'existence explicite
  avant la transaction (`404` propre). Le même gap existe très probablement dans
  Courrier/Projets (déjà livrés, non modifiés dans cette passe — portée volontairement
  limitée à Missions).

  **Écart assumé, non corrigé** : `ProjetsDocumentsService.listByProjet`/`listByLivrable`
  (Phase 5) et son miroir `MissionsDocumentsService.listByMission` ne filtrent pas
  document par document avec `canView` — ils vérifient une seule fois l'accès au
  projet/à la mission porteur, puis renvoient tous les documents rattachés. Concrètement,
  un document marqué `secrete` reste donc visible dans cette liste pour un participant
  qui n'y aurait pas accès via `GET /ged/documents/:id` directement (confirmé
  empiriquement pendant ce test). C'est un gap pré-existant depuis la Phase 5, pas
  introduit ici ; laissé tel quel par cohérence entre les deux modules plutôt que
  corrigé unilatéralement côté Missions seulement — à traiter dans une passe dédiée si
  jugé prioritaire (filtrage `canView` par document dans les deux services).

  `seed-dev.ts` complété : module `missions`, permissions
  (`consulter`/`creer`/`modifier`/`valider`/`supprimer`), workflow Missions par défaut à
  3 étapes (`creation` → `en-cours` → `cloture`) et règle de numérotation
  `MIS-{ANNEE}-{SEQ:4}`.

  30+ vérifications HTTP contre le serveur réel (`npx nest start`) et la base locale,
  0 échec après la correction ci-dessus : création (numérotation `MIS-2026-0001`,
  démarrage de workflow) ; visibilité (404 pour un non-participant, 200 après ajout comme
  participant) ; action de suivi modifiable par son propre responsable même sans
  permission `missions/modifier` (règle par ligne de `mission_actions_suivi_write`,
  0016) ; dépenses avec recalcul automatique de `budget_reel` par trigger, refusées pour
  un participant sans droit de modification (403) ; documents (upload multipart pour les
  4 rôles, y compris justificatif de dépense corrélé) ; confidentialité `secrete` (visible
  pour le créateur, invisible pour un participant sans droit direct) ; workflow (transition
  `demarrer` exécutée, `etape_code`/`etape_libelle` synchronisés par le trigger SQL
  `sync_etape_cache`, historique et instance cohérents) ; suppression gardée par la
  permission `missions/supprimer` (403 pour un participant, 200 pour le titulaire de la
  permission, 404 ensuite) ; 401 sans JWT, 404 mission/entité inexistante, 400 rôle de
  document invalide ou dépense hors mission, 404 transition inexistante.

  `npx nest build` passe sans erreur.

- 2026-08-29 : Phase 7 (Notifications + cron) livrée et testée en réel. Périmètre :
  portage de `app.fn_detecter_et_notifier_retards` (dernier corps 0059) et
  internalisation de l'envoi SMTP (ex-Edge Function `envoyer-notifications-email`) via
  `@nestjs/schedule` (déjà enregistré dans `AppModule` depuis la Phase 0, jamais utilisé
  jusqu'ici). `app.fn_notifier_transition` reste un trigger SQL vivant, décision Phase 2
  inchangée (rien à porter) ; sa branche GED interroge toujours `ged_versements` (reponté
  en 0059, avant même la Phase 4 NestJS — aucun changement requis côté serveur).

  `WorkflowEngineService.resolveDestinatairesEtape` ajouté (méthode additive, aucun
  comportement existant modifié) : énumère TOUS les utilisateurs satisfaisant un acteur de
  transition (role/fonction/entite/entite_et_descendants/utilisateur/
  responsable_entite_courante/superieur_hierarchique_courant), par opposition à
  `acteurDeTransitionAutorise` (Phase 2) qui ne fait que vérifier UN candidat — nécessaire
  pour déterminer QUI relancer, pas seulement QUI est autorisé à agir. Même jeu de
  conditions SQL, une requête combinée par ligne `workflow_transition_roles` (fidèle à la
  boucle de l'origine).

  `server/notifications/retards.service.ts` (`RetardsService`, cron horaire
  `CronExpression.EVERY_HOUR`) : reprend telle quelle la double boucle 0059 — (1) instances
  `en_cours` dont l'étape courante dépasse `workflow_etapes.delai_jours`, résolution de
  l'objet porteur (courriers / ged_versements / missions, dans cet ordre, comme l'origine),
  ignoré si `supprime_le` renseigné, notification de chaque destinataire résolu via
  `resolveDestinatairesEtape` + escalade au responsable de l'entité parente de l'objet
  s'il existe ; (2) échéances `courrier_destinataires` (`type_diffusion='principal'`)
  dépassées, indépendamment du délai d'étape, spécifique Courrier. Déduplication
  au jour/objet fidèle à l'origine (`titre like 'Retard :%' and created_at::date =
  current_date`) — **partagée entre les deux boucles** : un objet déjà notifié par la
  boucle (1) le même jour n'est pas re-notifié par la boucle (2), même pour une raison
  différente (comportement de l'origine, pas une régression du portage — vérifié
  empiriquement pendant le test, voir plus bas).

  `server/notifications/email-notifications.service.ts` (`EmailNotificationsService`, cron
  5 min `CronExpression.EVERY_5_MINUTES`) : sélectionne les notifications `envoye_le is
  null` (limite 200, plus ancien d'abord), groupe par organisation, charge
  `parametres_smtp` (déjà porté en Phase 1 — `mot_de_passe` chiffré avec
  `server/common/crypto/encryption.util.ts`, dont le commentaire anticipait déjà
  explicitement cette Phase 7), ignore une organisation sans SMTP actif configuré (les
  notifications restent simplement en attente, reprises automatiquement plus tard — même
  comportement que l'Edge Function d'origine), envoie via `nodemailer` (nouvelle
  dépendance ; `secure` = vrai uniquement si `securite='ssl'`, portage direct de
  l'interprétation `tls: securite==='ssl'` de la version Deno), marque `envoye_le` en lot
  pour les seuls envois réussis, catch par notification (un échec individuel n'interrompt
  pas le lot).

  Aucun endpoint HTTP ajouté pour ces deux jobs : contrairement aux Edge Functions
  d'origine (invoquées périodiquement depuis l'extérieur via le tableau de bord Supabase,
  avec vérification du bearer `service_role`), `@nestjs/schedule` internalise l'horloge —
  il n'y a plus d'appelant externe à authentifier.

  **Observation hors périmètre, non corrigée** : `app.set_entite_chemin()` (catégorie 1,
  trigger SQL, inchangé depuis la Phase 0) référence l'opérateur de concaténation `ltree
  ||` sans qualifier son schéma ; le `search_path` par défaut de cette base locale
  (`"$user", public`) ne contient pas `extensions`, où l'opérateur est défini par
  l'extension `ltree`. Résultat : créer une entité avec un `parent_entite_id` renseigné
  échoue (`l'opérateur n'existe pas : extensions.ltree || extensions.ltree`) sur cette base
  locale précise. Découvert seulement maintenant car aucune phase précédente n'avait testé
  la création d'une entité enfant (tous les jeux de test n'utilisaient qu'une entité racine
  unique). Probablement sans impact en production Supabase (où `search_path` inclut
  généralement `extensions` par défaut) — à vérifier côté utilisateur si la hiérarchie
  d'entités est exercée en pratique. Contourné pour le test ci-dessous par un `SET
  search_path` scoped à la session de test uniquement (aucun changement de code produit).

  **Tests réels, sans mock, contre le serveur (`npx nest start`) et la base locale** :
  - Retards d'étape + escalade : `workflow_etapes.delai_jours` mis à 0 sur l'étape
    'Enregistré' du workflow Courrier (6 instances `en_cours` concernées), acteur
    `utilisateur` ajouté sur la transition sortante, un courrier temporairement rattaché à
    une entité enfant (créée pour le test) dont l'entité parente porte un responsable —
    7 notifications créées en un passage (6 relances + 1 escalade), exactement le compte
    attendu ; second passage immédiat : 0 nouvelle notification (idempotence confirmée) ;
    contenu vérifié ligne à ligne (destinataires, titres, messages).
  - Échéance courrier en isolation : délai d'étape réinitialisé, notification du jour
    supprimée pour l'objet testé, `courrier_destinataires.echeance` positionnée à hier sur
    un courrier `en_cours` distinct → 1 notification "Échéance dépassée depuis 1 jour(s)."
    générée, confirmant que la seconde boucle fonctionne indépendamment de la première
    quand elles ne se chevauchent pas sur le même objet le même jour.
  - Emails, cas SMTP non configuré : organisation sans `parametres_smtp` → 0 envoyée, 0
    échouée, toutes en attente (comportement de repli correct).
  - Emails, cas SMTP configuré mais injoignable : `parametres_smtp` factice
    (`localhost:1025`, mot de passe chiffré/déchiffré avec succès) sans serveur à l'écoute
    → échec propre par notification (`ECONNREFUSED` catché individuellement), `envoye_le`
    resté `null` pour les 18 notifications concernées (aucune marquée envoyée à tort),
    reprise possible au prochain passage du cron.
  - Emails, envoi réel de bout en bout : un serveur SMTP local jetable (`smtp-server` +
    `mailparser`, installés temporairement hors périmètre produit puis désinstallés) monté
    sur le port 1025 — **18 emails reçus avec succès**, destinataire/sujet/corps exacts
    vérifiés pour chacun (dont les 8 notifications de retard du test précédent et 10
    notifications Courrier restées en attente depuis les tests de la Phase 3), `envoye_le`
    correctement renseigné en lot. Contrairement à la réserve envisagée dans la directive
    de cette phase, l'envoi SMTP réel **a bien pu être vérifié de bout en bout**, pas
    seulement la sélection/le marquage.
  - Toutes les données et notifications créées pour ces tests ont été nettoyées après coup
    (acteur de transition, entité enfant, destinataire à échéance, `parametres_smtp`
    factice, notifications "Retard :" générées) ; aucun script de test n'a été laissé dans
    `server/scripts/`.

  `npx nest build` passe sans erreur ; démarrage réel (`npx nest start`) vérifié sans
  erreur après le nettoyage final, `NotificationsModule` (et donc `RetardsService`/
  `EmailNotificationsService`, tous deux `@Cron`) s'initialise correctement dans le graphe
  de dépendances (importé transitivement via `CourrierModule`, singleton partagé — pas de
  double enregistrement des jobs malgré les imports multiples de `WorkflowModule` par
  GED/Missions/Projets).

  `npx nest build` passe sans erreur.

