import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { enregistrerVersionSchema } from '../../common/schema-versions';

// v8.7.2 : indicateur « affichée sur la fiche d'exploitation » des entités,
// ajouté au démarrage de façon idempotente.
@Injectable()
export class EntitesSchemaService implements OnModuleInit {
  private readonly logger = new Logger(EntitesSchemaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.dataSource.query(
        'alter table entites add column if not exists sur_fiche_exploitation boolean not null default false',
      );
      await enregistrerVersionSchema(this.dataSource, 'v8.7.2-fiche-entites', "Entités affichées sur la fiche d'exploitation");
    } catch (err) {
      this.logger.error(`Schéma entités non appliqué : ${(err as Error).message}`);
    }
  }
}
