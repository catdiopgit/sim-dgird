import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MarchesAccesService } from './acces/marches-acces.service';
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
export class PhasesTypeMarcheController {
  constructor(
    private readonly phasesTypeMarcheService: PhasesTypeMarcheService,
    private readonly acces: MarchesAccesService,
  ) {}

  // Recette 2026-11 : lecture ouverte (référentiel nécessaire pour créer un
  // marché) ; écriture réservée à la cellule et aux administrateurs.
  private async assertParametrage(user: AuthenticatedUser): Promise<void> {
    if (!(await this.acces.peutParametrer(user))) {
      throw new ForbiddenException(
        'Seuls les membres de la cellule de passation des marchés et les administrateurs paramètrent les types de marché',
      );
    }
  }

  @Get()
  findAll(@Param('typeMarcheId') typeMarcheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.phasesTypeMarcheService.findAll(typeMarcheId, user.organisationId);
  }

  @Post()
  async create(
    @Param('typeMarcheId') typeMarcheId: string,
    @Body() dto: CreerPhaseTypeMarcheDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.assertParametrage(user);
    return this.phasesTypeMarcheService.create(user.organisationId, { typeMarcheId, ...dto });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePhaseTypeMarcheDto, @CurrentUser() user: AuthenticatedUser) {
    await this.assertParametrage(user);
    return this.phasesTypeMarcheService.update(id, user.organisationId, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertParametrage(user);
    return this.phasesTypeMarcheService.remove(id, user.organisationId);
  }
}
