import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsUUID } from 'class-validator';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermission } from './require-permission.decorator';
import { PermissionsService } from './permissions.service';
import type { PorteePermission } from './entities/permission.entity';

class AccorderPermissionDto {
  @IsUUID()
  roleId: string;

  @IsUUID()
  moduleId: string;

  @IsUUID()
  actionId: string;

  @IsEnum(['organisation', 'entite', 'entite_et_descendants', 'personnel'])
  portee: PorteePermission;
}

@Controller('administration/permissions')
@UseGuards(PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('actions')
  @RequirePermission('administration', 'consulter')
  listActions() {
    return this.permissionsService.listActions();
  }

  @Get('modules')
  @RequirePermission('administration', 'consulter')
  listModules() {
    return this.permissionsService.listModules();
  }

  @Get()
  @RequirePermission('administration', 'consulter')
  listByRole(@Query('roleId') roleId: string) {
    return this.permissionsService.listByRole(roleId);
  }

  @Post()
  @RequirePermission('administration', 'modifier')
  accorder(@Body() dto: AccorderPermissionDto) {
    return this.permissionsService.accorder(dto.roleId, dto.moduleId, dto.actionId, dto.portee);
  }

  @Patch(':id')
  @RequirePermission('administration', 'modifier')
  modifierPortee(@Param('id') id: string, @Body() dto: { portee: PorteePermission }) {
    return this.permissionsService.modifierPortee(id, dto.portee);
  }

  @Delete(':id')
  @RequirePermission('administration', 'modifier')
  revoquer(@Param('id') id: string) {
    return this.permissionsService.revoquer(id);
  }
}
