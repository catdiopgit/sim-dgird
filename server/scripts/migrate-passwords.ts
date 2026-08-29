import 'dotenv/config';
import dataSource from '../config/data-source';

// Script à lancer une seule fois lors de la bascule : copie les hash bcrypt de
// auth.users (géré par Supabase GoTrue, hors schéma public) vers la nouvelle
// colonne public.utilisateurs.password_hash. GoTrue hashe déjà en bcrypt
// ($2a$/$2b$), directement vérifiable par bcryptjs côté NestJS — aucune
// re-hash nécessaire.
//
// Usage : npx ts-node -P server/tsconfig.json server/scripts/migrate-passwords.ts [--dry-run]
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const ds = await dataSource.initialize();

  try {
    const rows: Array<{ id: string; email: string; encrypted_password: string | null }> =
      await ds.query(`
        select u.id, u.email, au.encrypted_password
        from public.utilisateurs u
        left join auth.users au on au.id = u.id
        where u.password_hash is null
      `);

    const migrables = rows.filter((r) => !!r.encrypted_password);
    const orphelins = rows.filter((r) => !r.encrypted_password);

    console.log(`${rows.length} utilisateur(s) sans password_hash.`);
    console.log(`  -> ${migrables.length} avec un hash bcrypt trouvé dans auth.users (migrables).`);
    if (orphelins.length > 0) {
      console.log(`  -> ${orphelins.length} SANS correspondance dans auth.users (reset manuel requis) :`);
      for (const o of orphelins) console.log(`     - ${o.email} (${o.id})`);
    }

    if (dryRun) {
      console.log('\n--dry-run : aucune écriture effectuée.');
      return;
    }

    for (const row of migrables) {
      await ds.query(`update public.utilisateurs set password_hash = $1 where id = $2`, [
        row.encrypted_password,
        row.id,
      ]);
    }
    console.log(`\n${migrables.length} password_hash migré(s).`);
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
