import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { FonctionsService } from './fonctions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

class UpsertFonctionDto {
  @IsOptional() @IsUUID() organisationId?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsBoolean() actif?: boolean;
}

@Controller('administration/fonctions')
@UseGuards(PermissionsGuard)
export class FonctionsController {
  constructor(private readonly fonctionsService: FonctionsService) {}

  // v8.7.2 : référentiel en lecture pour tous (fiche d'exploitation : fonction
  // de l'agent qui a enregistré le courrier), limité à l'organisation de
  // l'utilisateur connecté, comme les entités.
  @Get()
  findByOrganisation(@CurrentUser() user: AuthenticatedUser) {
    return this.fonctionsService.findByOrganisation(user.organisationId);
  }

  @Post()
  @RequirePermission('administration', 'creer')
  create(@Body() dto: UpsertFonctionDto) {
    return this.fonctionsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('administration', 'modifier')
  update(@Param('id') id: string, @Body() dto: UpsertFonctionDto) {
    return this.fonctionsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('administration', 'modifier')
  remove(@Param('id') id: string) {
    return this.fonctionsService.remove(id);
  }
}
