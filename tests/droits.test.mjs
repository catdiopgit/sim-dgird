// Tests automatiques des droits de l'API SIM (v8.8.0, lot 3).
// À lancer avant chaque livraison, contre une API démarrée (recette ou locale) :
//   SIM_API=http://127.0.0.1:3001/api SIM_COMPTES=tests/comptes.json npm run test:droits
// tests/comptes.json (non versionné) : [{ "email": "...", "password": "...", "admin": true|false }]
// Contrôles :
//  1. sans jeton, toute route non publique répond 401 ;
//  2. un compte non administrateur reçoit 403 sur les routes « administration » ;
//  3. pour chaque compte, les listes (courriers, versements GED, projets,
//     marchés) contiennent exactement les éléments qu'il peut ouvrir un à un.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = (process.env.SIM_API ?? 'http://127.0.0.1:3001/api').replace(/\/$/, '');
const COMPTES = JSON.parse(readFileSync(process.env.SIM_COMPTES ?? join(RACINE, 'tests/comptes.json'), 'utf8'));
const UUID = '00000000-0000-4000-8000-000000000000';

// --- Inventaire des routes à partir des contrôleurs ---
function fichiers(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? fichiers(p) : p.endsWith('.controller.ts') ? [p] : [];
  });
}
function inventaire() {
  const routes = [];
  for (const f of fichiers(join(RACINE, 'server'))) {
    const lignes = readFileSync(f, 'utf8').split('\n');
    let prefixe = '';
    let gardeClasse = false;
    let bloc = [];
    for (const l of lignes) {
      const t = l.trim();
      const c = t.match(/^@Controller\(\s*['"`]([^'"`]*)['"`]/);
      if (c) prefixe = c[1];
      if (/^@UseGuards\(.*PermissionsGuard/.test(t) && !l.startsWith(' ')) gardeClasse = true;
      if (t.startsWith('@')) { bloc.push(t); continue; }
      const http = bloc.map((d) => d.match(/^@(Get|Post|Patch|Put|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?/)).find(Boolean);
      if (http) {
        const perm = bloc.map((d) => d.match(/^@RequirePermission\(\s*'([^']+)'\s*,\s*'([^']+)'/)).find(Boolean);
        const chemin = `/${prefixe}/${http[2] ?? ''}`.replace(/\/+/g, '/').replace(/\/$/, '').replace(/:[A-Za-z]+/g, UUID);
        routes.push({
          methode: http[1].toUpperCase(),
          chemin,
          public: bloc.includes('@Public()'),
          module: perm?.[1] ?? null,
          garde: gardeClasse || bloc.some((d) => /^@UseGuards\(.*PermissionsGuard/.test(d)),
          fichier: f.slice(RACINE.length + 1),
        });
      }
      if (t !== '') bloc = [];
    }
  }
  return routes;
}
const ROUTES = inventaire();

async function appel(methode, chemin, jeton) {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
    body: methode === 'GET' || methode === 'DELETE' ? undefined : '{}',
  });
  return r;
}

const jetons = new Map();
async function connecter(compte) {
  if (jetons.has(compte.email)) return jetons.get(compte.email);
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: compte.email, password: compte.password }),
  });
  const d = await r.json();
  assert.equal(r.status, 200, `connexion ${compte.email} : ${r.status} ${d.message ?? ''}`);
  const jeton = d.accessToken ?? d.access_token;
  jetons.set(compte.email, jeton);
  return jeton;
}

test(`inventaire : ${ROUTES.length} routes trouvées`, () => {
  assert.ok(ROUTES.length > 100);
});

test('sans jeton, toute route non publique répond 401', async (t) => {
  const echecs = [];
  const cibles = ROUTES.filter((x) => !x.public);
  t.diagnostic(`${cibles.length} routes non publiques contrôlées`);
  for (const r of cibles) {
    const rep = await appel(r.methode, r.chemin, null);
    if (rep.status !== 401) echecs.push(`${r.methode} ${r.chemin} -> ${rep.status} (${r.fichier})`);
  }
  assert.deepEqual(echecs, []);
});

test('un compte non administrateur reçoit 403 sur les routes « administration »', async (t) => {
  const compte = COMPTES.find((c) => !c.admin);
  if (!compte) return t.skip('aucun compte non administrateur dans comptes.json');
  const jeton = await connecter(compte);
  const echecs = [];
  const cibles = ROUTES.filter((x) => x.module === 'administration' && x.garde && !x.public);
  assert.ok(cibles.length > 20, `routes administration trouvées : ${cibles.length}`);
  t.diagnostic(`${cibles.length} routes administration contrôlées avec ${compte.email}`);
  for (const r of cibles) {
    const rep = await appel(r.methode, r.chemin, jeton);
    if (rep.status !== 403) echecs.push(`${r.methode} ${r.chemin} -> ${rep.status}`);
  }
  assert.deepEqual(echecs, []);
});

const LISTES = [
  { nom: 'courriers', liste: '/courrier/courriers', detail: (id) => `/courrier/courriers/${id}` },
  { nom: 'versements GED', liste: '/ged/versements', detail: (id) => `/ged/versements/${id}` },
  { nom: 'projets', liste: '/projets', detail: (id) => `/projets/${id}` },
  { nom: 'marchés', liste: '/marches', detail: (id) => `/marches/${id}` },
];

for (const compte of COMPTES) {
  test(`listes = éléments ouvrables (${compte.email})`, async () => {
    const jeton = await connecter(compte);
    // Référence : ce qu'un administrateur liste (le plus large), puis accès unitaire.
    const admin = COMPTES.find((c) => c.admin) ?? compte;
    const jetonRef = await connecter(admin);
    for (const l of LISTES) {
      const repRef = await appel('GET', l.liste, jetonRef);
      const repMoi = await appel('GET', l.liste, jeton);
      if (repMoi.status === 403 || repRef.status === 403) continue; // module non accessible
      const tous = repRef.status === 200 ? (await repRef.json()).map((x) => x.id) : [];
      const moi = new Set(repMoi.status === 200 ? (await repMoi.json()).map((x) => x.id) : []);
      const candidats = [...new Set([...tous, ...moi])];
      const ouvrables = new Set();
      for (const id of candidats) if ((await appel('GET', l.detail(id), jeton)).status === 200) ouvrables.add(id);
      const enTrop = [...moi].filter((id) => !ouvrables.has(id));
      assert.deepEqual(enTrop, [], `${l.nom} : listés mais non ouvrables`);
      const manquants = [...ouvrables].filter((id) => !moi.has(id));
      assert.deepEqual(manquants, [], `${l.nom} : ouvrables mais absents de la liste`);
    }
  });
}
