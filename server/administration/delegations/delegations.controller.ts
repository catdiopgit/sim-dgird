import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { DelegationsService } from './delegations.service';

class CreateDelegationDto {
  @IsUUID() delegantId: string;
  @IsUUID() delegataireId: string;
  @IsOptional() @IsUUID() moduleId?: string | null;
  @IsOptional() @IsUUID() entiteId?: string | null;
  @IsDateString() dateDebut: string;
  @IsOptional() @IsDateString() dateFin?: string | null;
  @IsOptional() @IsString() motif?: string | null;
}

@Controller('administration/delegations')
@UseGuards(PermissionsGuard)
export class DelegationsController {
  constructor(private readonly delegationsService: DelegationsService) {}

  @Get()
  @RequirePermission('administration', 'consulter')
  list(@Query('utilisateurId') utilisateurId?: string, @Query('organisationId') organisationId?: string) {
    if (organisationId) return this.delegationsService.listPourOrganisation(organisationId);
    if (utilisateurId) return this.delegationsService.listPourUtilisateur(utilisateurId);
    throw new BadRequestException('utilisateurId ou organisationId requis');
  }

  @Post()
  @RequirePermission('administration', 'creer')
  create(@Body() dto: CreateDelegationDto) {
    return this.delegationsService.create(dto);
  }

  @Post(':id/revoquer')
  @RequirePermission('administration', 'modifier')
  revoquer(@Param('id') id: string) {
    return this.delegationsService.revoquer(id);
  }
}
