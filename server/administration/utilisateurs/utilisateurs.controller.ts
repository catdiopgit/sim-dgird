import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { CreerUtilisateurInput, UtilisateursService } from './utilisateurs.service';
import type { Utilisateur } from './entities/utilisateur.entity';

class CreerUtilisateurDto implements CreerUtilisateurInput {
  @IsString() email: string;
  @IsString() nom: string;
  @IsString() prenom: string;
  @IsOptional() @IsUUID() entiteId?: string | null;
  @IsOptional() @IsUUID() fonctionId?: string | null;
  @IsOptional() @IsString() matricule?: string | null;
  @IsOptional() @IsString() telephone?: string | null;
}

class UpdateUtilisateurDto {
  @IsOptional() @IsUUID() entiteId?: string | null;
  @IsOptional() @IsUUID() fonctionId?: string | null;
  @IsOptional() @IsString() matricule?: string | null;
  @IsOptional() @IsString() telephone?: string | null;
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() prenom?: string;
  @IsOptional() @IsIn(['actif', 'inactif', 'suspendu']) statut?: string;
  @IsOptional() @IsString() photoUrl?: string | null;
}

@Controller('administration/utilisateurs')
@UseGuards(PermissionsGuard)
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  @Get()
  @RequirePermission('utilisateurs', 'consulter')
  findByOrganisation(@CurrentUser() user: AuthenticatedUser, @Query('organisationId') organisationId?: string) {
    return this.utilisateursService.findByOrganisation(organisationId ?? user.organisationId);
  }

  @Get('moi')
  moi(@CurrentUser() user: AuthenticatedUser) {
    return this.utilisateursService.findOne(user.id);
  }

  @Get(':id')
  @RequirePermission('utilisateurs', 'consulter')
  findOne(@Param('id') id: string) {
    return this.utilisateursService.findOne(id);
  }

  @Post()
  @RequirePermission('utilisateurs', 'creer', 'entiteId')
  creer(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreerUtilisateurDto) {
    return this.utilisateursService.creerUtilisateur(user.organisationId, dto);
  }

  @Patch(':id')
  @RequirePermission('utilisateurs', 'modifier')
  update(@Param('id') id: string, @Body() dto: UpdateUtilisateurDto) {
    return this.utilisateursService.update(id, dto as Partial<Utilisateur>);
  }
}
