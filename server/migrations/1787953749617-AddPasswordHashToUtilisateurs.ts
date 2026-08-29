import { MigrationInterface, QueryRunner } from 'typeorm';

// Le mot de passe vivait dans auth.users (GoTrue/Supabase), hors du schéma
// public migré ici. Cette colonne l'accueille côté NestJS ; le backfill des
// hash bcrypt existants se fait via server/scripts/migrate-passwords.ts,
// séparément (script à lancer une seule fois, pas une migration répétable).
export class AddPasswordHashToUtilisateurs1787953749617 implements MigrationInterface {
  name = 'AddPasswordHashToUtilisateurs1787953749617';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "utilisateurs" ADD COLUMN "password_hash" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "utilisateurs" DROP COLUMN "password_hash"`);
  }
}
