# Déploiement sur VPS Windows Server

Guide pour déployer cette application (frontend Vite/React + API NestJS +
PostgreSQL) sur le VPS Windows Server, avec une base PostgreSQL neuve et
accès par IP (pas encore de nom de domaine — section HTTPS à la fin, pour
plus tard).

## 1. Architecture cible

```
Internet (IP:80) → IIS (reverse proxy + fichiers statiques)
                      ├── /            → dist/ (frontend buildé, servi tel quel)
                      └── /api/*       → proxy vers http://localhost:3001/api/*
                                            ↑
                                     API NestJS (service Windows, NSSM)
                                            ↑
                                     PostgreSQL (local au VPS)

Fichiers (pièces jointes/décharges/documents GED) → disque local, dossier
STORAGE_ROOT, HORS du dossier de déploiement (décision d, voir MIGRATION.md).
```

Deux processus tournent en permanence sur le VPS : PostgreSQL (déjà un
service Windows après installation) et l'API NestJS (à transformer en
service Windows avec NSSM, étape 6). IIS ne fait que servir les fichiers
statiques du frontend et rediriger `/api/*` vers l'API.

## 2. Prérequis à installer sur le VPS (RDP)

1. **Node.js** — version LTS récente (22 ou 24, celle utilisée en
   développement). https://nodejs.org/ → installeur `.msi`, cocher "Add to
   PATH". Vérifier après installation : `node --version`, `npm --version`
   dans une invite de commande.
2. **PostgreSQL** — version 18 recommandée (celle utilisée en
   développement), ou toute version ≥ 13 (le code utilise `gen_random_uuid()`
   natif, disponible depuis Postgres 13, et l'extension `ltree`).
   https://www.postgresql.org/download/windows/ → installeur EDB. Noter le
   mot de passe du rôle `postgres` défini pendant l'installation. Le service
   Windows `postgresql-x64-<version>` démarre automatiquement.
3. **Git** — https://git-scm.com/download/win (pour cloner/mettre à jour le
   dépôt ; sinon, transférer les fichiers autrement, par ex. via un ZIP).
4. **IIS** (rôle Windows) — Gestionnaire de serveur → Ajouter des rôles et
   fonctionnalités → Serveur Web (IIS). Puis installer deux extensions IIS
   (pas incluses par défaut) depuis iis.net :
   - **URL Rewrite** (module de réécriture d'URL)
   - **Application Request Routing (ARR)** (nécessaire pour le reverse
     proxy vers l'API)
5. **NSSM** (Non-Sucking Service Manager) — https://nssm.cc/download,
   dézipper `nssm.exe` (version 64 bits) dans un dossier permanent, par
   exemple `C:\nssm\nssm.exe`. Sert à faire tourner l'API NestJS comme un
   vrai service Windows (démarrage auto, redémarrage si crash).

## 3. Récupérer le code et configurer

```powershell
cd D:\
git clone https://github.com/catdiopgit/sim-dgird.git
cd sim-dgird
npm install
```

Copier `.env.example` en `.env` et remplir :

```
VITE_API_URL=http://<IP_DU_VPS>/api
VITE_APP_NAME=SIM

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<mot de passe postgres défini à l'installation>
DB_DATABASE=sim_dgird_prod
DB_SSL=false

JWT_SECRET=<générer : openssl rand -base64 48, ou node -e "console.log(require('crypto').randomBytes(48).toString('base64'))">
JWT_EXPIRES_IN=8h

ENCRYPTION_KEY=<générer : node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">

PORT=3001

STORAGE_ROOT=D:\sim-dgird-storage
```

Points importants :
- `VITE_API_URL` doit pointer vers l'IP publique du VPS (le frontend
  buildé l'utilisera pour appeler l'API depuis le navigateur de
  l'utilisateur, pas depuis le serveur lui-même).
- `STORAGE_ROOT` doit être **hors** de `D:\sim-dgird\` (le dossier du
  dépôt) — sinon un futur `git pull`/redéploiement risquerait d'écraser ou
  de perturber les fichiers déjà stockés. Créer ce dossier :
  `mkdir D:\sim-dgird-storage`.
- `JWT_SECRET` et `ENCRYPTION_KEY` : générer des valeurs uniques pour la
  prod, ne jamais réutiliser celles du poste de développement. Les noter
  en lieu sûr (perdre `ENCRYPTION_KEY` rend illisibles les mots de passe
  SMTP déjà chiffrés en base).

## 4. Base de données

Dans une invite `psql` (ou pgAdmin) en tant que `postgres` :

```sql
CREATE DATABASE sim_dgird_prod;
```

Puis, depuis le dossier du dépôt (PowerShell), dans l'ordre :

```powershell
# 1) Stub des schémas Supabase (auth/storage) nécessaires aux migrations
#    d'origine + fix du search_path (voir le commentaire en tête du fichier)
psql -U postgres -d sim_dgird_prod -f server\scripts\supabase-schema-stub.sql

# 2) Les 82 migrations SQL d'origine, dans l'ordre numérique
Get-ChildItem supabase\migrations\*.sql | Sort-Object Name | ForEach-Object {
  Write-Host "-- $($_.Name)"
  psql -U postgres -d sim_dgird_prod -f $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Échec sur $($_.Name)" }
}

# 3) La migration TypeORM (ajout de utilisateurs.password_hash)
npm run migration:run
```

Vérifier qu'il n'y a eu aucune erreur à l'étape 2 (le script s'arrête au
premier échec). 64 tables doivent exister dans `public` à la fin.

### Créer le premier compte administrateur

La base est vide : il n'y a ni organisation ni utilisateur. Deux scripts
fournis (voir `server/scripts/`) :

```powershell
# Crée l'organisation + le premier utilisateur (mot de passe hashé bcrypt)
npm run bootstrap:admin -- DGIRD "Direction Générale des Infrastructures Routières et du Désenclavement" admin@dgird.sn Prénom Nom "UnMotDePasseSolide!"

# Peuple le référentiel minimal (modules/actions/permissions, une entité
# racine, un rôle "tout-organisation" attribué à cet utilisateur, un
# workflow Courrier à 2 étapes, une règle de numérotation)
npm run seed:dev -- DGIRD admin@dgird.sn
```

Après ça, ce compte peut se connecter et créer le reste (entités, rôles
plus fins, utilisateurs, workflows spécifiques) via l'interface
d'administration.

## 5. Build

```powershell
npm run build          # frontend → dist/
npm run server:build   # backend  → dist-server/
```

Vérifier que `dist-server\main.js` et `dist\index.html` existent.

## 6. Lancer l'API en service Windows (NSSM)

```powershell
C:\nssm\nssm.exe install SimDgirdApi
```

Une fenêtre s'ouvre :
- **Path** : `C:\Program Files\nodejs\node.exe`
- **Startup directory** : `D:\sim-dgird`
- **Arguments** : `dist-server\main.js`
- Onglet **I/O** : rediriger stdout/stderr vers des fichiers de log, par
  exemple `D:\sim-dgird\logs\api.out.log` et `...\api.err.log` (créer le
  dossier `logs` d'abord).

Puis :

```powershell
net start SimDgirdApi
```

Vérifier que l'API répond en local :

```powershell
curl http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"admin@dgird.sn","password":"UnMotDePasseSolide!"}'
```

(remplacer par les vrais identifiants créés à l'étape 4) — une réponse
avec un token JWT confirme que l'API tourne et parle bien à la base.

En cas de souci, consulter les fichiers de log configurés ci-dessus.

## 7. Servir le frontend + reverse proxy avec IIS

1. Gestionnaire IIS → **Sites** → **Add Website** :
   - Nom : `sim-dgird`
   - Chemin physique : `D:\sim-dgird\dist`
   - Liaison : port 80, IP du VPS (ou "Toutes les non attribuées")

2. Dans `D:\sim-dgird\dist`, créer un fichier `web.config` (à côté de
   `index.html`) avec le reverse proxy `/api` + le fallback SPA pour React
   Router :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3001/api/{R:1}" />
        </rule>
        <rule name="SPA fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

   Ce fichier doit être recopié à chaque `npm run build` (Vite régénère
   entièrement `dist/`) — soit le remettre manuellement après chaque
   build, soit le déplacer dans `public/web.config` à la racine du projet
   (Vite copie automatiquement le contenu de `public/` dans `dist/` sans
   modification à chaque build, donc il y survivra).

3. Recharger le site IIS. Tester depuis un poste externe :
   `http://<IP_DU_VPS>/` doit afficher la page de connexion, et se
   connecter avec le compte créé à l'étape 4 doit fonctionner (vérifie que
   le reverse proxy `/api` fonctionne).

## 8. Vérifications post-déploiement

- Connexion avec le compte admin créé à l'étape 4.
- Créer un courrier de test, l'imputer, vérifier le workflow.
- Uploader une pièce jointe, la télécharger — vérifier que le fichier
  apparaît bien dans `D:\sim-dgird-storage\` (et pas dans le dossier du
  dépôt).
- `net start` / `services.msc` : confirmer que `SimDgirdApi` redémarre
  bien après un `net stop` + `net start` (simule un redémarrage serveur).
- Les deux jobs cron (Phase 7 — détection de retards horaire, envoi
  d'emails toutes les 5 min) tournent tant que le service `SimDgirdApi`
  est démarré ; l'envoi d'email ne fonctionnera que si des `parametres_smtp`
  sont configurés pour l'organisation (Administration → Paramétrage).

## 9. Mises à jour futures

```powershell
cd D:\sim-dgird
git pull
npm install
npm run build
npm run server:build
net stop SimDgirdApi
net start SimDgirdApi
```

Si une nouvelle migration TypeORM a été ajoutée entre-temps :
`npm run migration:run` avant de redémarrer le service.

## 10. Plus tard : nom de domaine + HTTPS

Une fois un nom de domaine pointé vers l'IP du VPS (enregistrement DNS A) :

1. IIS Manager → Sites → `sim-dgird` → **Bindings** → ajouter une liaison
   HTTPS (port 443).
2. Obtenir un certificat gratuit avec **win-acme**
   (https://www.win-acme.com/) : exécuter `wacs.exe`, choisir le site IIS
   `sim-dgird`, il configure automatiquement le certificat et son
   renouvellement (tâche planifiée).
3. Mettre à jour `VITE_API_URL` dans `.env` avec `https://<domaine>/api`,
   puis rebuilder le frontend (`npm run build`) — cette valeur est figée
   dans le bundle JS à la compilation, elle ne se lit pas dynamiquement.
4. Optionnel : rediriger tout le trafic HTTP vers HTTPS (règle URL Rewrite
   supplémentaire dans `web.config`).
