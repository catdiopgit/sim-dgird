import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../utilisateurs/entities/role.entity';
import { UtilisateurRole } from '../utilisateurs/entities/utilisateur-role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(UtilisateurRole) private readonly utilisateurRoles: Repository<UtilisateurRole>,
  ) {}

  // organisationId null inclus : renvoie aussi les rôles système partagés (organisation_id is null).
  findAccessibles(organisationId: string): Promise<Role[]> {
    return this.roles
      .createQueryBuilder('r')
      .where('r.organisationId = :organisationId or r.organisationId is null', { organisationId })
      .orderBy('r.libelle', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roles.findOneBy({ id });
    if (!role) throw new NotFoundException('Rôle introuvable');
    return role;
  }

  create(data: Partial<Role>): Promise<Role> {
    return this.roles.save(this.roles.create(data));
  }

  async update(id: string, data: Partial<Role>): Promise<Role> {
    const role = await this.findOne(id);
    if (role.systeme) {
      throw new NotFoundException('Les rôles système ne sont pas modifiables');
    }
    await this.roles.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.systeme) {
      throw new NotFoundException('Les rôles système ne sont pas supprimables');
    }
    await this.roles.delete(id);
  }

  // Attribution de rôle à un utilisateur (portée organisation entière si entiteId absent).
  attribuer(utilisateurId: string, roleId: string, entiteId: string | null, dateDebut: string, dateFin?: string | null) {
    const attribution = this.utilisateurRoles.create({ utilisateurId, roleId, entiteId, dateDebut, dateFin });
    return this.utilisateurRoles.save(attribution);
  }

  async revoquer(id: string): Promise<void> {
    await this.utilisateurRoles.delete(id);
  }

  listAttributions(utilisateurId: string): Promise<UtilisateurRole[]> {
    return this.utilisateurRoles.find({ where: { utilisateurId }, relations: { role: true } });
  }
}
