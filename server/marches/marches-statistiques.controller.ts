import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MarchesStatistiquesService, type StatutCalculeMarche } from './marches-statistiques.service';

@Controller('marches-statistiques')
export class MarchesStatistiquesController {
  constructor(private readonly statistiquesService: MarchesStatistiquesService) {}

  @Get()
  obtenir(
    @Query('periodeDebut') periodeDebut: string | undefined,
    @Query('periodeFin') periodeFin: string | undefined,
    @Query('typeMarcheId') typeMarcheId: string | undefined,
    @Query('statut') statut: StatutCalculeMarche | undefined,
    @Query('responsableId') responsableId: string | undefined,
    @Query('candidatNom') candidatNom: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.statistiquesService.obtenirStatistiques(
      { periodeDebut, periodeFin, typeMarcheId, statut, responsableId, candidatNom },
      user,
    );
  }
}
