import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UtilisateursService } from '../administration/utilisateurs/utilisateurs.service';

export interface RoleActif {
  roleId: string;
  roleCode: string;
  entiteId: string | null;
}
export interface PermissionRow {
  roleId: string;
  moduleCode: string;
  actionCode: string;
  portee: string;
}
export interface EntiteLite {
  id: string;
  parentEntiteId: string | null;
}

// Remplace src/services/profile.ts (fetchProfileData), qui interrogeait
// directement utilisateurs/utilisateur_roles/permissions/entites via
// PostgREST. Le frontend a besoin de ce paquet complet pour calculer les
// permissions côté client (aide UX uniquement, cf. ProfileContext — la
// barrière de sécurité réelle reste PermissionsGuard/AuthorizationService).
@Injectable()
export class ProfileService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly utilisateursService: UtilisateursService,
  ) {}

  async getProfileData(utilisateurId: string) {
    const profile = await this.utilisateursService.findOne(utilisateurId);

    const rolesActifs: RoleActif[] = await this.dataSource.query(
      `
      select ur.role_id as "roleId", r.code as "roleCode", ur.entite_id as "entiteId"
      from utilisateur_roles ur
      join roles r on r.id = ur.role_id
      where ur.utilisateur_id = $1
        and (ur.date_fin is null or ur.date_fin >= current_date)
      `,
      [utilisateurId],
    );

    const roleIds = [...new Set(rolesActifs.map((r) => r.roleId))];
    let permissions: PermissionRow[] = [];
    if (roleIds.length > 0) {
      permissions = await this.dataSource.query(
        `
        select p.role_id as "roleId", m.code as "moduleCode", a.code as "actionCode", p.portee
        from permissions p
        join modules m on m.id = p.module_id
        join actions a on a.id = p.action_id
        where p.role_id = any($1::uuid[])
        `,
        [roleIds],
      );
    }

    const entites: EntiteLite[] = await this.dataSource.query(
      `select id, parent_entite_id as "parentEntiteId" from entites where organisation_id = $1`,
      [profile.organisationId],
    );

    return { profile, rolesActifs, permissions, entites };
  }
}
