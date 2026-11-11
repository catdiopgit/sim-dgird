import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { ParametrageService } from './parametrage.service';

class CreateListeDto {
  @IsUUID() organisationId: string;
  @IsString() code: string;
  @IsString() libelle: string;
  @IsOptional() @IsUUID() moduleId?: string | null;
}

class CreateValeurDto {
  @IsString() code: string;
  @IsString() libelle: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() couleur?: string | null;
}

@Controller('administration/parametrage')
@UseGuards(PermissionsGuard)
export class ParametrageController {
  constructor(private readonly parametrageService: ParametrageService) {}

  // Référentiel en lecture, nécessaire à tous les utilisateurs (formulaires et
  // fiches courrier) : pas de permission « administration », mais toujours
  // limité à l'organisation de l'utilisateur connecté (recette 2026-11).
  @Get('listes')
  listListes(@CurrentUser() user: AuthenticatedUser) {
    return this.parametrageService.listListes(user.organisationId);
  }

  @Get('listes/:listeId/valeurs')
  async listValeurs(@Param('listeId') listeId: string, @CurrentUser() user: AuthenticatedUser) {
    const listes = await this.parametrageService.listListes(user.organisationId);
    if (!listes.some((l) => l.id === listeId)) throw new ForbiddenException('Liste hors de votre organisation');
    return this.parametrageService.listValeurs(listeId);
  }

  @Post('listes')
  @RequirePermission('administration', 'creer')
  createListe(@Body() dto: CreateListeDto) {
    return this.parametrageService.createListe(dto);
  }

  @Patch('listes/:id')
  @RequirePermission('administration', 'modifier')
  updateListe(@Param('id') id: string, @Body() dto: Partial<CreateListeDto>) {
    return this.parametrageService.updateListe(id, dto);
  }

  @Delete('listes/:id')
  @RequirePermission('administration', 'modifier')
  deleteListe(@Param('id') id: string) {
    return this.parametrageService.deleteListe(id);
  }

  @Post('listes/:listeId/valeurs')
  @RequirePermission('administration', 'creer')
  createValeur(@Param('listeId') listeId: string, @Body() dto: CreateValeurDto) {
    return this.parametrageService.createValeur({ ...dto, listeId });
  }

  @Patch('valeurs/:id')
  @RequirePermission('administration', 'modifier')
  updateValeur(@Param('id') id: string, @Body() dto: Partial<CreateValeurDto>) {
    return this.parametrageService.updateValeur(id, dto);
  }

  @Delete('valeurs/:id')
  @RequirePermission('administration', 'modifier')
  deleteValeur(@Param('id') id: string) {
    return this.parametrageService.deleteValeur(id);
  }

  @Get('numerotation')
  @RequirePermission('administration', 'consulter')
  listReglesNumerotation(@Query('organisationId') organisationId: string) {
    return this.parametrageService.listReglesNumerotation(organisationId);
  }

  @Post('numerotation')
  @RequirePermission('administration', 'modifier')
  upsertRegleNumerotation(@Body() dto: Record<string, unknown>) {
    return this.parametrageService.upsertRegleNumerotation(dto);
  }

  @Delete('numerotation/:id')
  @RequirePermission('administration', 'modifier')
  deleteRegleNumerotation(@Param('id') id: string) {
    return this.parametrageService.deleteRegleNumerotation(id);
  }
}
