import { MigrationInterface, QueryRunner } from 'typeorm';

// Le schéma d'origine (0003_utilisateurs_roles_permissions.sql) définissait
// `id uuid primary key references auth.users(id)`, sans DEFAULT : c'est
// Supabase Auth (GoTrue) qui générait et fournissait l'id à l'INSERT. Depuis
// la bascule vers l'auth JWT native (Phase 8), UtilisateursService.creerUtilisateur
// ne fournit plus d'id — TypeORM (@PrimaryGeneratedColumn('uuid')) attend que
// la base le génère elle-même. Sans DEFAULT, chaque création échouait avec
// une violation NOT NULL sur "id" (23502 → "Un champ obligatoire est
// manquant", cf. QueryFailedFilter), quels que soient les champs saisis.
// La FK vers auth.users est également obsolète (plus de GoTrue) et aurait de
// toute façon bloqué l'insert d'un uuid généré côté serveur.
export class FixUtilisateursIdDefault1788260000000 implements MigrationInterface {
  name = 'FixUtilisateursIdDefault1788260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "utilisateurs" DROP CONSTRAINT IF EXISTS "utilisateurs_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "utilisateurs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "utilisateurs" ALTER COLUMN "id" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_id_fkey" FOREIGN KEY ("id") REFERENCES auth.users(id) ON DELETE CASCADE`,
    );
  }
}
