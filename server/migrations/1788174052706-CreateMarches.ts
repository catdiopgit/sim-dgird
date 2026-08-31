import { MigrationInterface, QueryRunner } from 'typeorm';

// Module "Gestion des passations de marchés" (documentation/Gestion des
// passations de marché.txt) — création complète du schéma : paramétrage
// (types_marche / phases_type_marche), objet métier (marches / phases_marche),
// candidats et attribution. Rattachement documentaire via de nouvelles
// colonnes nullables sur `documents`, même patron que Projets/Missions
// (marche_id, phase_marche_id, marche_candidat_id, type_marche_valeur_id).
export class CreateMarches1788174052706 implements MigrationInterface {
  name = 'CreateMarches1788174052706';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "unite_duree_phase" AS ENUM ('jour', 'semaine', 'mois')`);
    await queryRunner.query(`CREATE TYPE "statut_cloture_marche" AS ENUM ('en_cours', 'cloture')`);
    await queryRunner.query(`CREATE TYPE "type_candidat_marche" AS ENUM ('entreprise', 'consultant')`);

    await queryRunner.query(`
      CREATE TABLE "types_marche" (
        "id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
        "organisation_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE CASCADE,
        "code" text NOT NULL,
        "libelle" text NOT NULL,
        "description" text,
        "ordre" int NOT NULL DEFAULT 0,
        "actif" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("organisation_id", "code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "phases_type_marche" (
        "id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
        "type_marche_id" uuid NOT NULL REFERENCES "types_marche"("id") ON DELETE CASCADE,
        "nom" text NOT NULL,
        "description" text,
        "ordre" int NOT NULL DEFAULT 0,
        "duree" int NOT NULL DEFAULT 1,
        "unite_duree" "unite_duree_phase" NOT NULL DEFAULT 'jour',
        "obligatoire" boolean NOT NULL DEFAULT true,
        "actif" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_phases_type_marche_type" ON "phases_type_marche" ("type_marche_id")`);

    await queryRunner.query(`
      CREATE TABLE "marches" (
        "id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
        "organisation_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE CASCADE,
        "entite_id" uuid NOT NULL REFERENCES "entites"("id"),
        "reference" text NOT NULL,
        "objet" text NOT NULL,
        "description" text,
        "type_marche_id" uuid NOT NULL REFERENCES "types_marche"("id"),
        "responsable_id" uuid REFERENCES "utilisateurs"("id"),
        "date_debut_prevue" date,
        "date_fin_prevue" date,
        "montant_estimatif" numeric,
        "observations" text,
        "statut_cloture" "statut_cloture_marche" NOT NULL DEFAULT 'en_cours',
        "cloture_par" uuid REFERENCES "utilisateurs"("id"),
        "cloture_le" timestamptz,
        "created_by" uuid REFERENCES "utilisateurs"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("organisation_id", "reference")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_marches_organisation" ON "marches" ("organisation_id")`);
    await queryRunner.query(`CREATE INDEX "idx_marches_entite" ON "marches" ("entite_id")`);
    await queryRunner.query(`CREATE INDEX "idx_marches_type" ON "marches" ("type_marche_id")`);

    await queryRunner.query(`
      CREATE TABLE "phases_marche" (
        "id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
        "marche_id" uuid NOT NULL REFERENCES "marches"("id") ON DELETE CASCADE,
        "phase_type_marche_id" uuid REFERENCES "phases_type_marche"("id") ON DELETE SET NULL,
        "nom" text NOT NULL,
        "description" text,
        "ordre" int NOT NULL DEFAULT 0,
        "duree_prevue" int NOT NULL,
        "unite_duree" "unite_duree_phase" NOT NULL DEFAULT 'jour',
        "obligatoire" boolean NOT NULL DEFAULT true,
        "date_debut_prevue" date,
        "date_fin_prevue" date,
        "date_debut_reelle" date,
        "date_fin_reelle" date,
        "observations" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_phases_marche_marche" ON "phases_marche" ("marche_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_phases_marche_fin_prevue" ON "phases_marche" ("date_fin_prevue") WHERE "date_fin_reelle" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "marche_candidats" (
        "id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
        "marche_id" uuid NOT NULL REFERENCES "marches"("id") ON DELETE CASCADE,
        "nom" text NOT NULL,
        "type" "type_candidat_marche" NOT NULL,
        "coordonnees" text,
        "informations_complementaires" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_marche_candidats_marche" ON "marche_candidats" ("marche_id")`);

    await queryRunner.query(`
      CREATE TABLE "marche_attributions" (
        "id" uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
        "marche_id" uuid NOT NULL UNIQUE REFERENCES "marches"("id") ON DELETE CASCADE,
        "candidat_attributaire_id" uuid NOT NULL REFERENCES "marche_candidats"("id"),
        "montant_attribue" numeric,
        "date_attribution" date,
        "observations" text,
        "created_by" uuid REFERENCES "utilisateurs"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "marche_id" uuid REFERENCES "marches"("id")`);
    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "phase_marche_id" uuid REFERENCES "phases_marche"("id")`);
    await queryRunner.query(
      `ALTER TABLE "documents" ADD COLUMN "marche_candidat_id" uuid REFERENCES "marche_candidats"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD COLUMN "type_marche_valeur_id" uuid REFERENCES "valeurs_listes"("id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_documents_marche" ON "documents" ("marche_id")`);
    await queryRunner.query(`CREATE INDEX "idx_documents_phase_marche" ON "documents" ("phase_marche_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_phase_marche"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_marche"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "type_marche_valeur_id"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "marche_candidat_id"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "phase_marche_id"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "marche_id"`);

    await queryRunner.query(`DROP TABLE "marche_attributions"`);
    await queryRunner.query(`DROP TABLE "marche_candidats"`);
    await queryRunner.query(`DROP TABLE "phases_marche"`);
    await queryRunner.query(`DROP TABLE "marches"`);
    await queryRunner.query(`DROP TABLE "phases_type_marche"`);
    await queryRunner.query(`DROP TABLE "types_marche"`);

    await queryRunner.query(`DROP TYPE "type_candidat_marche"`);
    await queryRunner.query(`DROP TYPE "statut_cloture_marche"`);
    await queryRunner.query(`DROP TYPE "unite_duree_phase"`);
  }
}
