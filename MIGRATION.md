# Migration Supabase → PostgreSQL direct (NestJS + TypeORM)

Statut global : **Phases 0 à 3 terminées** (squelette NestJS + TypeORM + Auth JWT ; administration complète ; moteur de workflow générique + référentiel ; Courrier complet avec stockage pièces jointes/décharge). Phase 4 (GED) à démarrer.

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
| 4 | GED | À faire |
| 5 | Projets | À faire |
| 6 | Missions | À faire |
| 7 | Notifications + cron (`@nestjs/schedule`) | À faire |
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

