# SIM — Système d'Information Managérial

Application de gestion Courrier, GED, Projets et Missions. React + TypeScript + Vite pour le frontend, Supabase/PostgreSQL pour le backend.

Voir la proposition d'architecture validée pour le détail du modèle de données et des décisions de conception.

## Stack

- **Frontend** — React 19, TypeScript, Vite, React Router 7, Ant Design, TanStack Query, Zustand, React Hook Form + Zod
- **Backend** — Supabase (Auth, PostgreSQL, Storage, Edge Functions), Row Level Security

## Architecture du projet

```text
src/
├── components/       composants transverses (tables, badges, upload…)
├── layouts/          shell applicatif (sidebar, header, breadcrumb)
├── pages/            routes de premier niveau (login, dashboard…)
├── modules/          un dossier par domaine métier
│   ├── courrier/
│   ├── ged/
│   ├── projets/
│   ├── missions/
│   ├── utilisateurs/
│   └── administration/
├── services/         accès Supabase par domaine (queries/mutations)
├── hooks/
├── contexts/          session, organisation courante, permissions
├── types/             types générés depuis le schéma PostgreSQL
├── utils/
├── config/            client Supabase, variables d'environnement
└── routes/

supabase/
├── migrations/
├── functions/
└── seed/
```

## Installation

```bash
npm install
cp .env.example .env
```

Renseignez dans `.env` les identifiants de votre projet Supabase (Project Settings → API) :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Tant que ces variables ne sont pas renseignées, l'application affiche un écran de configuration au lieu de démarrer.

## Lancement en développement

```bash
npm run dev
```

Ouvre l'application sur `http://localhost:5173`. Sans utilisateur existant, créez-en un depuis le dashboard Supabase (Authentication → Users) pour tester la connexion.

## Build de production

```bash
npm run build
```

Compile les types (`tsc -b`) puis génère le bundle de production avec Vite.

## Base de données

Les migrations SQL vivent dans `supabase/migrations/` (19 migrations, y compris RLS et seed). Le modèle de données (organisation/habilitations, moteur de workflow générique, courrier, GED, projets, missions, socle transversal) est détaillé dans le document d'architecture validé.

## État d'avancement

Le développement suit un plan en 10 phases, chaque phase vérifiée avant la suivante :

| Phase | Contenu | État |
| --- | --- | --- |
| 1 | Initialisation — projet, Supabase, UI, auth | ✅ en place |
| 2 | Base de données — migrations, RLS, seed | ✅ en place |
| 3 | Administration — organisation, utilisateurs, rôles, permissions | ✅ en place |
| 4 | Courriers | ✅ en place |
| 5 | GED | à venir |
| 6 | Projets | à venir |
| 7 | Missions | à venir |
| 8 | Tableau de bord | à venir |
| 9 | Sécurité & audit | à venir |
| 10 | Tests & finalisation | à venir |

## Remarque environnement

Le projet est développé dans `C:\Users\CATDIOP\Projects\sim` (hors dossier synchronisé Google Drive) car l'installation de `node_modules` dans un dossier Drive provoque des erreurs `EPERM`/`EBADF` liées au verrouillage de fichiers par la synchronisation en direct. Seul le code source (hors `node_modules`) doit être versionné/synchronisé.
