import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { enregistrerVersionSchema } from '../common/schema-versions';

// v8.6.5 : colonnes de sécurité des comptes, ajoutées au démarrage de façon
// idempotente. À l'ajout initial, tous les comptes existants doivent changer
// leur mot de passe à la prochaine connexion (mots de passe temporaires
// connus de l'administrateur jusque-là).
@Injectable()
export class AuthSchemaService implements OnModuleInit {
  private readonly logger = new Logger(AuthSchemaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      const existe: unknown[] = await this.dataSource.query(
        `select 1 from information_schema.columns
         where table_name = 'utilisateurs' and column_name = 'doit_changer_mot_de_passe'`,
      );
      await this.dataSource.query(
        'alter table utilisateurs add column if not exists doit_changer_mot_de_passe boolean not null default false',
      );
      await this.dataSource.query('alter table utilisateurs add column if not exists echecs_connexion integer not null default 0');
      await this.dataSource.query('alter table utilisateurs add column if not exists verrouille_jusqua timestamptz');
      await this.dataSource.query('alter table utilisateurs add column if not exists mot_de_passe_modifie_le timestamptz');
      await this.dataSource.query('alter table utilisateurs add column if not exists jeton_version integer not null default 0');
      await enregistrerVersionSchema(this.dataSource, 'v8.6.5-comptes', 'Sécurité des comptes : changement obligatoire, verrouillage');
      await enregistrerVersionSchema(this.dataSource, 'v8.6.6-jetons', 'Révocation des jetons (jeton_version)');
      if (existe.length === 0) {
        const n: Array<{ count: string }> = await this.dataSource.query(
          `with maj as (update utilisateurs set doit_changer_mot_de_passe = true where password_hash is not null returning 1)
           select count(*) from maj`,
        );
        this.logger.log(`Sécurité des comptes activée : ${n[0]?.count ?? 0} compte(s) devront changer leur mot de passe`);
      }
    } catch (err) {
      this.logger.error(`Schéma sécurité des comptes non appliqué : ${(err as Error).message}`);
    }
  }
}
