import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
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

  // Référentiel en lecture, nécessaire à tous les utilisateurs (formulaires et
  // fiches courrier) : pas de permission « administration », mais toujours
  // limité à l'organisation de l'utilisateur connecté (recette 2026-11).
  @Get()
  findByOrganisation(@CurrentUser() user: AuthenticatedUser) {
    const organisationId = user.organisationId;
    return this.entitesService.findByOrganisation(organisationId);
  }

  @Get('types')
  listTypeEntites(@CurrentUser() user: AuthenticatedUser) {
    const organisationId = user.organisationId;
    return this.entitesService.listTypeEntites(organisationId);
  }

  @Post('types')
  @RequirePermission('administration', 'creer')
  createTypeEntite(@Body() dto: CreateTypeEntiteDto) {
    return this.entitesService.createTypeEntite(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const entite = await this.entitesService.findOne(id);
    if (entite.organisationId !== user.organisationId) throw new ForbiddenException('Entité hors de votre organisation');
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
