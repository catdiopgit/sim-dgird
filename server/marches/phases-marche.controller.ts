import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PhasesMarcheService, type UpdatePhaseMarcheData } from './phases-marche.service';

class UpdatePhaseMarcheDto implements UpdatePhaseMarcheData {
  @IsOptional() @IsString() dateDebutReelle?: string | null;
  @IsOptional() @IsString() dateFinReelle?: string | null;
  @IsOptional() @IsString() observations?: string | null;
}

@Controller('marches/:marcheId/phases')
export class PhasesMarcheController {
  constructor(private readonly phasesMarcheService: PhasesMarcheService) {}

  @Get()
  findAll(@Param('marcheId') marcheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.phasesMarcheService.findAll(marcheId, user);
  }

  // Idempotent : génère les phases depuis le type de marché si aucune
  // n'existe, sinon recalcule les dates prévisionnelles (§10 — à rappeler
  // après toute modification de la date de début prévisionnelle du marché).
  @Post('planifier')
  planifier(@Param('marcheId') marcheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.phasesMarcheService.planifier(marcheId, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePhaseMarcheDto, @CurrentUser() user: AuthenticatedUser) {
    return this.phasesMarcheService.update(id, dto, user);
  }

  @Post(':id/demarrer')
  demarrer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.phasesMarcheService.demarrer(id, user);
  }

  @Post(':id/valider')
  valider(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.phasesMarcheService.valider(id, user);
  }
}
