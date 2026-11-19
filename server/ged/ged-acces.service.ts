import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { MarchesAccesService } from '../marches/acces/marches-acces.service';

// v8.6 : règles d'accès communes à la GED.
//  - Archiviste = « GED / archiver » sur toute l'organisation (rôle Archiviste,
//    ou administrateur technique). Il contrôle, classe et archive.
//  - Gestion du plan de classement : archiviste, ou « administration /
//    modifier » sur toute l'organisation.
//  - Entités productrices : une série (ou un sous-dossier) peut être réservée
//    à des entités ; un agent ne propose un classement que dans les séries de
//    son entité (ou d'une entité parente). Sans entité productrice : ouvert.
@Injectable()
export class GedAccesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
    private readonly marchesAcces: MarchesAccesService,
  ) {}

  estArchiviste(userId: string): Promise<boolean> {
    return this.authorizationService.hasPermission(userId, 'ged', 'archiver', null, false);
  }

  async peutGererPlan(userId: string): Promise<boolean> {
    if (await this.estArchiviste(userId)) return true;
    return this.authorizationService.hasPermission(userId, 'administration', 'modifier', null, false);
  }

  estResponsableHierarchique(entiteId: string | null, userId: string): Promise<boolean> {
    if (!entiteId) return Promise.resolve(false);
    return this.marchesAcces.estResponsableHierarchique(entiteId, userId);
  }

  // v8.6.11 — direction d'une entité : la première entité de type
  // « direction » en remontant l'organigramme (elle-même comprise). Les
  // bureaux et cellules rattachés directement à la DG relèvent de la DG.
  async directionDe(entiteId: string | null | undefined): Promise<string | null> {
    if (!entiteId) return null;
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `with recursive chaine as (
         select e.id, e.parent_entite_id, 0 as niveau from entites e where e.id = $1
         union all
         select p.id, p.parent_entite_id, c.niveau + 1
         from entites p join chaine c on p.id = c.parent_entite_id where c.niveau < 20
       )
       select c.id from chaine c
       join entites e on e.id = c.id
       join type_entites t on t.id = e.type_entite_id
       where t.code = 'direction'
       order by c.niveau limit 1`,
      [entiteId],
    );
    return rows[0]?.id ?? entiteId;
  }

  async estDirection(entiteId: string, organisationId: string): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `select 1 from entites e join type_entites t on t.id = e.type_entite_id
        where e.id = $1 and e.organisation_id = $2 and t.code = 'direction' and e.actif`,
      [entiteId, organisationId],
    );
    return rows.length > 0;
  }

  async directions(organisationId: string): Promise<Array<{ id: string; sigle: string | null; libelle: string }>> {
    return this.dataSource.query(
      `select e.id, e.sigle, e.libelle from entites e join type_entites t on t.id = e.type_entite_id
        where e.organisation_id = $1 and t.code = 'direction' and e.actif
        order by e.niveau, e.ordre, e.libelle`,
      [organisationId],
    );
  }

  // L'utilisateur appartient-il à l'entité (ou à une de ses sous-entités) ?
  async appartientA(entiteId: string | null, user: AuthenticatedUser): Promise<boolean> {
    if (!entiteId || !user.entiteId) return false;
    if (entiteId === user.entiteId) return true;
    const rows: unknown[] = await this.dataSource.query(
      `with recursive chaine as (
         select id, parent_entite_id, 0 as niveau from entites where id = $1
         union all
         select p.id, p.parent_entite_id, c.niveau + 1
         from entites p join chaine c on p.id = c.parent_entite_id where c.niveau < 20
       ) select 1 from chaine where id = $2 limit 1`,
      [user.entiteId, entiteId],
    );
    return rows.length > 0;
  }

  // Entités productrices applicables à un dossier : celles du dossier le plus
  // proche (lui-même ou un parent) qui en définit.
  async entitesProductrices(dossierId: string): Promise<string[]> {
    const rows: Array<{ entites: string[] }> = await this.dataSource.query(
      `with recursive chaine as (
         select id, parent_dossier_id, 0 as niveau from ged_dossiers where id = $1
         union all
         select p.id, p.parent_dossier_id, c.niveau + 1
         from ged_dossiers p join chaine c on p.id = c.parent_dossier_id where c.niveau < 30
       )
       select array_agg(e.entite_id) as entites
       from chaine c join ged_dossier_entites e on e.dossier_id = c.id
       group by c.niveau order by c.niveau limit 1`,
      [dossierId],
    );
    return rows[0]?.entites ?? [];
  }

  async peutProposerDossier(dossierId: string, user: AuthenticatedUser): Promise<boolean> {
    if (await this.estArchiviste(user.id)) return true;
    const entites = await this.entitesProductrices(dossierId);
    if (entites.length === 0) return true;
    for (const entiteId of entites) {
      if (await this.appartientA(entiteId, user)) return true;
    }
    return false;
  }

  // Archivistes de l'organisation (destinataires des notifications de dépôt).
  async archivistes(organisationId: string): Promise<string[]> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `select distinct u.id
       from utilisateurs u
       join utilisateur_roles ur on ur.utilisateur_id = u.id
         and (ur.date_fin is null or ur.date_fin >= current_date)
       join permissions p on p.role_id = ur.role_id and p.portee = 'organisation'
       join modules mo on mo.id = p.module_id and mo.code = 'ged'
       join actions a on a.id = p.action_id and a.code = 'archiver'
       join roles r on r.id = ur.role_id and r.code = 'archiviste'
       where u.organisation_id = $1`,
      [organisationId],
    );
    return rows.map((r) => r.id);
  }
}
