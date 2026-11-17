import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GedDossiersService, type CreerDossierData, type ModifierDossierData } from './ged-dossiers.service';

class CreerDossierDto implements CreerDossierData {
  @IsString() code: string;
  @IsString() libelle: string;
  @IsOptional() @IsUUID() entiteId?: string | null;
  @IsOptional() @IsUUID() parentDossierId?: string | null;
  @IsOptional() @IsUUID() categorieId?: string | null;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() icone?: string | null;
  @IsOptional() @IsString() couleur?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() ordre?: number | null;
}

class ModifierDossierDto implements ModifierDossierData {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() categorieId?: string | null;
  @IsOptional() @IsString() icone?: string | null;
  @IsOptional() @IsString() couleur?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() ordre?: number | null;
  @IsOptional() @IsBoolean() actif?: boolean;
  @IsOptional() @IsBoolean() deplacer?: boolean;
  @IsOptional() @IsUUID() parentDossierId?: string | null;
}

class EntitesProductricesDto {
  @IsArray() @IsUUID('all', { each: true }) entiteIds: string[];
}

@Controller('ged/dossiers')
export class GedDossiersController {
  constructor(private readonly dossiersService: GedDossiersService) {}

  // Le plan de classement est visible de toute l'organisation (choix du
  // dossier au dépôt, explorateur Archives).
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('organisationId') _organisationId?: string) {
    return this.dossiersService.findAll(user.organisationId);
  }

  @Post()
  create(@Body() dto: CreerDossierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.create(dto, user);
  }

  @Post('importer-plan-direction-routes')
  importerPlan(@CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.importerPlanDirectionRoutes(user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ModifierDossierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.update(id, dto, user);
  }

  @Put(':id/entites-productrices')
  definirEntites(@Param('id') id: string, @Body() dto: EntitesProductricesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.definirEntitesProductrices(id, dto.entiteIds, user);
  }

  @Delete(':id')
  supprimer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.supprimer(id, user);
  }
}
