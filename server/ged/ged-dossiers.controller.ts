import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
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
}

class ModifierDossierDto implements ModifierDossierData {
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() categorieId?: string | null;
  @IsOptional() @IsString() icone?: string | null;
  @IsOptional() @IsString() couleur?: string | null;
  @IsOptional() @IsBoolean() deplacer?: boolean;
  @IsOptional() @IsUUID() parentDossierId?: string | null;
}

@Controller('ged/dossiers')
export class GedDossiersController {
  constructor(private readonly dossiersService: GedDossiersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('organisationId') organisationId?: string) {
    return this.dossiersService.findAll(organisationId ?? user.organisationId);
  }

  @Post()
  create(@Body() dto: CreerDossierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ModifierDossierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.update(id, dto, user);
  }
}
