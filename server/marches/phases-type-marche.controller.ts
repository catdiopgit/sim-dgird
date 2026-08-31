import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PermissionsGuard } from '../administration/permissions/permissions.guard';
import { RequirePermission } from '../administration/permissions/require-permission.decorator';
import {
  PhasesTypeMarcheService,
  type CreerPhaseTypeMarcheData,
  type UpdatePhaseTypeMarcheData,
} from './phases-type-marche.service';
import type { UniteDureePhase } from './entities/phase-type-marche.entity';

const UNITES_DUREE: UniteDureePhase[] = ['jour', 'semaine', 'mois'];

class CreerPhaseTypeMarcheDto implements Omit<CreerPhaseTypeMarcheData, 'typeMarcheId'> {
  @IsString() nom: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsInt() ordre?: number;
  @IsOptional() @IsInt() duree?: number;
  @IsOptional() @IsIn(UNITES_DUREE) uniteDuree?: UniteDureePhase;
  @IsOptional() @IsBoolean() obligatoire?: boolean;
}

class UpdatePhaseTypeMarcheDto implements UpdatePhaseTypeMarcheData {
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsInt() ordre?: number;
  @IsOptional() @IsInt() duree?: number;
  @IsOptional() @IsIn(UNITES_DUREE) uniteDuree?: UniteDureePhase;
  @IsOptional() @IsBoolean() obligatoire?: boolean;
  @IsOptional() @IsBoolean() actif?: boolean;
}

@Controller('marches/types/:typeMarcheId/phases')
@UseGuards(PermissionsGuard)
export class PhasesTypeMarcheController {
  constructor(private readonly phasesTypeMarcheService: PhasesTypeMarcheService) {}

  @Get()
  @RequirePermission('marches', 'consulter')
  findAll(@Param('typeMarcheId') typeMarcheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.phasesTypeMarcheService.findAll(typeMarcheId, user.organisationId);
  }

  @Post()
  @RequirePermission('marches', 'creer')
  create(
    @Param('typeMarcheId') typeMarcheId: string,
    @Body() dto: CreerPhaseTypeMarcheDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.phasesTypeMarcheService.create(user.organisationId, { typeMarcheId, ...dto });
  }

  @Patch(':id')
  @RequirePermission('marches', 'modifier')
  update(@Param('id') id: string, @Body() dto: UpdatePhaseTypeMarcheDto, @CurrentUser() user: AuthenticatedUser) {
    return this.phasesTypeMarcheService.update(id, user.organisationId, dto);
  }

  @Delete(':id')
  @RequirePermission('marches', 'modifier')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.phasesTypeMarcheService.remove(id, user.organisationId);
  }
}
