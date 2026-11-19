import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { enregistrerVersionSchema } from '../common/schema-versions';

// v8.5.2 : colonne « responsable » (intitulé, modèle PPM) sur les phases-modèles
// et les phases de marché. Ajout idempotent au démarrage pour éviter une
// manipulation SQL manuelle sur le serveur (même contenu que
// outils/sql/v8-5-2-responsable-phases.sql).
@Injectable()
export class MarchesSchemaService implements OnModuleInit {
  private readonly logger = new Logger(MarchesSchemaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.dataSource.query('alter table phases_type_marche add column if not exists responsable text');
      await this.dataSource.query('alter table phases_marche add column if not exists responsable text');
      await enregistrerVersionSchema(this.dataSource, 'v8.5-marches', 'Marchés : responsable des phases, modules projets et marchés');
      // v8.5.4 : la base de production a été initialisée sans les modules
      // « marches » (et selon les cas « projets ») dans la table modules —
      // d'où « Module 'marches' introuvable » à la numérotation, et aucune
      // permission « Marchés » attribuable aux rôles. Ajout idempotent.
      await this.dataSource.query(
        `insert into modules (code, libelle)
         select v.code, v.libelle from (values ('projets', 'Projets'), ('marches', 'Marchés')) v(code, libelle)
         where not exists (select 1 from modules m where m.code = v.code)`,
      );
    } catch (err) {
      this.logger.error(`Colonne « responsable » des phases non ajoutée : ${(err as Error).message}`);
    }
  }
}
