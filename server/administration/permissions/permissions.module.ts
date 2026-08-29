import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Action } from './entities/action.entity';
import { ModuleFonctionnel } from './entities/module-fonctionnel.entity';
import { Permission } from './entities/permission.entity';
import { AuthorizationService } from './authorization.service';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Action, ModuleFonctionnel, Permission])],
  providers: [AuthorizationService, PermissionsGuard, PermissionsService],
  controllers: [PermissionsController],
  exports: [AuthorizationService, PermissionsGuard, PermissionsService],
})
export class PermissionsModule {}
