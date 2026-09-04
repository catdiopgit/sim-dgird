import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { RolesService } from './roles.service';

class UpsertRoleDto {
  @IsOptional() @IsUUID() organisationId?: string | null;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsString() description?: string | null;
}

class AttribuerRoleDto {
  @IsUUID() utilisateurId: string;
  @IsUUID() roleId: string;
  @IsOptional() @IsUUID() entiteId?: string | null;
  @IsOptional() @IsDateString() dateDebut?: string;
  @IsOptional() @IsDateString() dateFin?: string | null;
}

@Controller('administration/roles')
@UseGuards(PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('administration', 'consulter')
  findAccessibles(@Query('organisationId') organisationId: string) {
    return this.rolesService.findAccessibles(organisationId);
  }

  @Post()
  @RequirePermission('administration', 'creer')
  create(@Body() dto: UpsertRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('administration', 'modifier')
  update(@Param('id') id: string, @Body() dto: UpsertRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('administration', 'modifier')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  @Get('attributions')
  @RequirePermission('administration', 'consulter')
  listAttributions(@Query('utilisateurId') utilisateurId: string) {
    return this.rolesService.listAttributions(utilisateurId);
  }

  @Post('attributions')
  @RequirePermission('administration', 'modifier')
  attribuer(@Body() dto: AttribuerRoleDto) {
    const dateDebut = dto.dateDebut ?? new Date().toISOString().slice(0, 10);
    return this.rolesService.attribuer(dto.utilisateurId, dto.roleId, dto.entiteId ?? null, dateDebut, dto.dateFin);
  }

  @Delete('attributions/:id')
  @RequirePermission('administration', 'modifier')
  revoquer(@Param('id') id: string) {
    return this.rolesService.revoquer(id);
  }
}
