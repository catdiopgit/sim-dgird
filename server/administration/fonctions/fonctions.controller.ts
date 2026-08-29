import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { FonctionsService } from './fonctions.service';

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

  @Get()
  @RequirePermission('administration', 'consulter')
  findByOrganisation(@Query('organisationId') organisationId: string) {
    return this.fonctionsService.findByOrganisation(organisationId);
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
