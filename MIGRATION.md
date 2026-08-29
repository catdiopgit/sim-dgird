# Migration Supabase → PostgreSQL direct (NestJS + TypeORM)

Statut global : **Phases 0 à 2 terminées** (squelette NestJS + TypeORM + Auth JWT ; administration complète ; moteur de workflow générique + référentiel). Notifications/retards courrier différés à la Phase 3 (voir journal). Phase 3 (Courrier) à démarrer.

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
| 3 | Courrier | À faire |
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

