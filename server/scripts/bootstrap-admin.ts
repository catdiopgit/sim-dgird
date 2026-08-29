import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import dataSource from '../config/data-source';

// Bootstrap d'une base neuve : crée la toute première organisation et le
// tout premier utilisateur (mot de passe déjà hashé, bcryptjs 10 rounds —
// même méthode que UtilisateursService), avant de pouvoir se connecter et
// avant de pouvoir lancer seed-dev.ts (qui exige que l'organisation et
// l'utilisateur existent déjà). Idempotent : relançable sans dupliquer.
//
// Usage :
//   npx ts-node -P server/tsconfig.json server/scripts/bootstrap-admin.ts \
//     <organisation_code> <organisation_nom> <email> <prenom> <nom> <mot_de_passe>
//
// Ce script ne crée volontairement ni entité, ni rôle, ni permission :
// lancez seed-dev.ts juste après pour peupler le référentiel minimal
// (modules/actions/permissions, une entité racine, un rôle "tout-
// organisation" attribué à cet utilisateur).

async function main() {
  const [organisationCode, organisationNom, email, prenom, nom, motDePasse] = process.argv.slice(2);
  if (!organisationCode || !organisationNom || !email || !prenom || !nom || !motDePasse) {
    console.error(
      'Usage : bootstrap-admin.ts <organisation_code> <organisation_nom> <email> <prenom> <nom> <mot_de_passe>',
    );
    process.exit(1);
  }

  const ds = await dataSource.initialize();
  try {
    const orgRows: Array<{ id: string }> = await ds.query('select id from organisations where code = $1', [
      organisationCode,
    ]);
    const orgId =
      orgRows[0]?.id ??
      (
        await ds.query('insert into organisations (code, nom) values ($1, $2) returning id', [
          organisationCode,
          organisationNom,
        ])
      )[0].id;
    console.log(`Organisation '${organisationCode}' : ${orgRows[0] ? 'déjà existante' : 'créée'} (${orgId}).`);

    const passwordHash = await bcrypt.hash(motDePasse, 10);
    const userRows: Array<{ id: string }> = await ds.query('select id from utilisateurs where email = $1', [email]);
    if (userRows[0]) {
      await ds.query('update utilisateurs set password_hash = $1 where id = $2', [passwordHash, userRows[0].id]);
      console.log(`Utilisateur '${email}' : déjà existant, mot de passe réinitialisé (${userRows[0].id}).`);
    } else {
      // utilisateurs.id référence auth.users(id) (héritage du schéma Supabase
      // d'origine, 0003) : il faut d'abord une ligne auth.users portant le
      // même id, sans quoi l'insert ci-dessous échoue sur la contrainte de
      // clé étrangère utilisateurs_id_fkey (trouvé en testant ce script
      // contre une base neuve, cf. server/scripts/supabase-schema-stub.sql).
      const [{ id: authUserId }]: Array<{ id: string }> = await ds.query(
        'insert into auth.users (email) values ($1) returning id',
        [email],
      );
      const inserted: Array<{ id: string }> = await ds.query(
        `insert into utilisateurs (id, organisation_id, prenom, nom, email, password_hash, statut)
         values ($1, $2, $3, $4, $5, $6, 'actif') returning id`,
        [authUserId, orgId, prenom, nom, email, passwordHash],
      );
      console.log(`Utilisateur '${email}' : créé (${inserted[0].id}).`);
    }

    console.log(
      `\nProchaine étape : npx ts-node -P server/tsconfig.json server/scripts/seed-dev.ts ${organisationCode} ${email}`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
