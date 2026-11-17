import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

// v8.6 GED : évolutions de schéma et de paramétrage appliquées au démarrage,
// de façon idempotente (même principe que MarchesSchemaService) :
//  - plan de classement : ordre d'affichage, activation, entités productrices ;
//  - index sur l'empreinte des fichiers (contrôle des doublons) ;
//  - circuit d'archivage complet « ged-standard » réservé au rôle Archiviste,
//    installé comme circuit par défaut (les versements déjà en cours gardent
//    leur ancien circuit) ;
//  - permissions GED du rôle Archiviste (portée organisation).
@Injectable()
export class GedSchemaService implements OnModuleInit {
  private readonly logger = new Logger(GedSchemaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.schema();
    } catch (err) {
      this.logger.error(`Schéma GED v8.6 non appliqué : ${(err as Error).message}`);
      return;
    }
    const organisations: Array<{ id: string }> = await this.dataSource.query('select id from organisations');
    for (const { id } of organisations) {
      try {
        await this.dataSource.transaction((m) => this.parametrerOrganisation(m, id));
      } catch (err) {
        this.logger.error(`Circuit GED non installé pour l'organisation ${id} : ${(err as Error).message}`);
      }
    }
  }

  private async schema(): Promise<void> {
    const q = (sql: string) => this.dataSource.query(sql);
    await q('alter table ged_dossiers add column if not exists ordre integer not null default 0');
    await q('alter table ged_dossiers add column if not exists actif boolean not null default true');
    await q(
      `create table if not exists ged_dossier_entites (
         dossier_id uuid not null references ged_dossiers(id) on delete cascade,
         entite_id uuid not null references entites(id) on delete cascade,
         created_at timestamptz not null default now(),
         primary key (dossier_id, entite_id)
       )`,
    );
    await q('create index if not exists idx_document_versions_hash on document_versions (hash_sha256)');
    await q(
      `insert into modules (code, libelle)
       select 'ged', 'GED' where not exists (select 1 from modules where code = 'ged')`,
    );
  }

  private async parametrerOrganisation(m: EntityManager, organisationId: string): Promise<void> {
    const moduleId: string = (await m.query("select id from modules where code = 'ged'"))[0].id;

    // Rôle Archiviste (créé s'il n'existe pas) et ses permissions GED.
    let roleId: string | undefined = (
      await m.query("select id from roles where organisation_id = $1 and code = 'archiviste'", [organisationId])
    )[0]?.id;
    if (!roleId) {
      roleId = (
        await m.query(
          `insert into roles (organisation_id, code, libelle, description)
           values ($1, 'archiviste', 'Archiviste', 'Contrôle, classe et archive les documents (GED)') returning id`,
          [organisationId],
        )
      )[0].id;
    }
    await m.query(
      `insert into permissions (role_id, module_id, action_id, portee)
       select $1, $2, a.id, 'organisation'
       from actions a
       where a.code in ('consulter', 'creer', 'modifier', 'archiver', 'valider')
         and not exists (
           select 1 from permissions p where p.role_id = $1 and p.module_id = $2 and p.action_id = a.id
         )`,
      [roleId, moduleId],
    );

    const existe = await m.query(
      "select 1 from workflow_definitions where organisation_id = $1 and module_id = $2 and code = 'ged-standard'",
      [organisationId, moduleId],
    );
    if (existe.length > 0) return;

    const definitionId: string = (
      await m.query(
        `insert into workflow_definitions (organisation_id, module_id, code, libelle, description, est_defaut)
         values ($1, $2, 'ged-standard', 'Circuit d''archivage GED',
                 'Soumission → Réception → Contrôle → (À corriger) → Classement → Archivage, actions réservées à l''archiviste', false)
         returning id`,
        [organisationId, moduleId],
      )
    )[0].id;

    const etapes: Array<[string, string, number, string]> = [
      ['soumission', 'Soumis', 1, 'initiale'],
      ['reception', 'Réceptionné', 2, 'intermediaire'],
      ['controle', 'En contrôle', 3, 'intermediaire'],
      ['a_corriger', 'À corriger', 4, 'rejet'],
      ['classement', 'En classement', 5, 'intermediaire'],
      ['archivage', 'Archivé', 6, 'finale'],
    ];
    const idEtape = new Map<string, string>();
    for (const [code, libelle, ordre, type] of etapes) {
      const id: string = (
        await m.query(
          `insert into workflow_etapes (workflow_definition_id, code, libelle, ordre, type_etape)
           values ($1, $2, $3, $4, $5::type_etape_workflow) returning id`,
          [definitionId, code, libelle, ordre, type],
        )
      )[0].id;
      idEtape.set(code, id);
    }

    const transitions: Array<[string, string, string, string]> = [
      ['recevoir', 'Accuser réception', 'soumission', 'reception'],
      ['controler', 'Contrôler', 'reception', 'controle'],
      ['demander-correction', 'Demander une correction', 'controle', 'a_corriger'],
      ['valider-controle', 'Valider le contrôle', 'controle', 'classement'],
      ['archiver', 'Archiver', 'classement', 'archivage'],
    ];
    for (const [code, libelle, source, cible] of transitions) {
      const transitionId: string = (
        await m.query(
          `insert into workflow_transitions (workflow_definition_id, etape_source_id, etape_cible_id, code, libelle_action)
           values ($1, $2, $3, $4, $5) returning id`,
          [definitionId, idEtape.get(source), idEtape.get(cible), code, libelle],
        )
      )[0].id;
      await m.query(
        `insert into workflow_transition_roles (workflow_transition_id, role_id, type_acteur)
         values ($1, $2, 'role')`,
        [transitionId, roleId],
      );
    }

    await m.query(
      'update workflow_definitions set est_defaut = false where organisation_id = $1 and module_id = $2 and id <> $3',
      [organisationId, moduleId, definitionId],
    );
    await m.query('update workflow_definitions set est_defaut = true where id = $1', [definitionId]);
    this.logger.log(`Circuit d'archivage GED installé pour l'organisation ${organisationId}`);
  }
}
