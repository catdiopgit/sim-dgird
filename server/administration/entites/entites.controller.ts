import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { EntitesService } from './entites.service';

class UpsertEntiteDto {
  @IsOptional() @IsUUID() organisationId?: string;
  @IsOptional() @IsUUID() parentEntiteId?: string | null;
  @IsOptional() @IsUUID() typeEntiteId?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsString() sigle?: string | null;
  @IsOptional() @IsUUID() responsableUtilisateurId?: string | null;
  @IsOptional() @IsBoolean() actif?: boolean;
}

class CreateTypeEntiteDto {
  @IsUUID() organisationId: string;
  @IsString() code: string;
  @IsString() libelle: string;
}

class UpdateTypeEntiteDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelle?: string;
}

@Controller('administration/entites')
@UseGuards(PermissionsGuard)
export class EntitesController {
  constructor(private readonly entitesService: EntitesService) {}

  @Get()
  @RequirePermission('administration', 'consulter')
  findByOrganisation(@Query('organisationId') organisationId: string) {
    return this.entitesService.findByOrganisation(organisationId);
  }

  @Get('types')
  @RequirePermission('administration', 'consulter')
  listTypeEntites(@Query('organisationId') organisationId: string) {
    return this.entitesService.listTypeEntites(organisationId);
  }

  @Post('types')
  @RequirePermission('administration', 'creer')
  createTypeEntite(@Body() dto: CreateTypeEntiteDto) {
    return this.entitesService.createTypeEntite(dto);
  }

  @Get(':id')
  @RequirePermission('administration', 'consulter')
  findOne(@Param('id') id: string) {
    return this.entitesService.findOne(id);
  }

  @Post()
  @RequirePermission('administration', 'creer')
  create(@Body() dto: UpsertEntiteDto) {
    return this.entitesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('administration', 'modifier', 'id')
  update(@Param('id') id: string, @Body() dto: UpsertEntiteDto) {
    return this.entitesService.update(id, dto);
  }
}
