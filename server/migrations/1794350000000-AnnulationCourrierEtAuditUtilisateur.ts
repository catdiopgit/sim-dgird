import { MigrationInterface, QueryRunner } from 'typeorm';

// Recette module Courrier (novembre 2026).
//
// 1. Annulation d'un courrier : colonnes annule_le / annule_par /
//    motif_annulation. Le courrier reste au registre (numéro conservé).
// 2. Action « annuler » sur le module courrier, accordée aux rôles
//    administrateur, admin_dev et secretaire (ajustable ensuite dans
//    Administration > Rôles et permissions).
// 3. auth.uid() (stub Supabase, renvoyait toujours NULL) lit désormais le
//    paramètre de transaction app.user_id, positionné par le backend NestJS
//    avant ses écritures sur courriers : le journal d'audit
//    (app.fn_audit_trigger) enregistre ainsi l'auteur des modifications.
//    Hors de ces transactions le paramètre est absent → NULL, comme avant.
export class AnnulationCourrierEtAuditUtilisateur1794350000000 implements MigrationInterface {
  name = 'AnnulationCourrierEtAuditUtilisateur1794350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "courriers"
        ADD COLUMN IF NOT EXISTS "annule_le" timestamptz,
        ADD COLUMN IF NOT EXISTS "annule_par" uuid REFERENCES "utilisateurs"(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "motif_annulation" text
    `);

    await queryRunner.query(`INSERT INTO actions (code, libelle) VALUES ('annuler', 'Annuler') ON CONFLICT (code) DO NOTHING`);
    await queryRunner.query(`
      INSERT INTO permissions (role_id, module_id, action_id, portee)
      SELECT r.id, m.id, a.id, 'organisation'::portee_permission
      FROM roles r
      JOIN modules m ON m.code = 'courrier'
      JOIN actions a ON a.code = 'annuler'
      WHERE r.code IN ('administrateur', 'admin_dev', 'secretaire')
      ON CONFLICT (role_id, module_id, action_id) DO NOTHING
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT null::uuid $$`);
    await queryRunner.query(`
      DELETE FROM permissions WHERE action_id = (SELECT id FROM actions WHERE code = 'annuler')
        AND module_id = (SELECT id FROM modules WHERE code = 'courrier')
    `);
    await queryRunner.query(`
      ALTER TABLE "courriers" DROP COLUMN IF EXISTS "motif_annulation",
        DROP COLUMN IF EXISTS "annule_par", DROP COLUMN IF EXISTS "annule_le"
    `);
  }
}
