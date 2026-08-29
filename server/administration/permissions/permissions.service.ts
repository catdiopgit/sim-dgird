import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Action } from './entities/action.entity';
import { ModuleFonctionnel } from './entities/module-fonctionnel.entity';
import { Permission, type PorteePermission } from './entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Action) private readonly actions: Repository<Action>,
    @InjectRepository(ModuleFonctionnel) private readonly modules: Repository<ModuleFonctionnel>,
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
  ) {}

  listActions(): Promise<Action[]> {
    return this.actions.find({ order: { code: 'ASC' } });
  }

  listModules(): Promise<ModuleFonctionnel[]> {
    return this.modules.find({ order: { ordre: 'ASC' } });
  }

  listByRole(roleId: string): Promise<Permission[]> {
    return this.permissions.findBy({ roleId });
  }

  accorder(roleId: string, moduleId: string, actionId: string, portee: PorteePermission): Promise<Permission> {
    const permission = this.permissions.create({ roleId, moduleId, actionId, portee });
    return this.permissions.save(permission);
  }

  async revoquer(id: string): Promise<void> {
    await this.permissions.delete(id);
  }

  async modifierPortee(id: string, portee: PorteePermission): Promise<Permission> {
    await this.permissions.update(id, { portee });
    return this.permissions.findOneByOrFail({ id });
  }
}
