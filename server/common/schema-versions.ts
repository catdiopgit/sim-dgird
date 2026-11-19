import type { DataSource } from 'typeorm';

// v8.6.6 — registre des évolutions de schéma appliquées au démarrage
// (table schema_versions) : chaque étape est inscrite une fois, avec sa date.
export async function enregistrerVersionSchema(dataSource: DataSource, code: string, description: string): Promise<void> {
  await dataSource.query(
    `create table if not exists schema_versions (
       code text primary key,
       description text,
       applique_le timestamptz not null default now()
     )`,
  );
  await dataSource.query(
    'insert into schema_versions (code, description) values ($1, $2) on conflict (code) do nothing',
    [code, description],
  );
}
