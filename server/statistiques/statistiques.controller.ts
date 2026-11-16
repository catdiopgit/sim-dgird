import { Controller, Get, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StatistiquesService } from './statistiques.service';

@Controller('statistiques')
export class StatistiquesController {
  constructor(private readonly service: StatistiquesService) {}

  @Get('courrier')
  courrier(
    @Query('dateDebut') dateDebut: string | undefined,
    @Query('dateFin') dateFin: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.courrier({ dateDebut, dateFin }, user);
  }

  @Get('projets')
  projets(
    @Query('dateDebut') dateDebut: string | undefined,
    @Query('dateFin') dateFin: string | undefined,
    @Query('statutValeurId') statutValeurId: string | undefined,
    @Query('responsableId') responsableId: string | undefined,
    @Query('organismeExecutionType') organismeExecutionType: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.projets({ dateDebut, dateFin, statutValeurId, responsableId, organismeExecutionType }, user);
  }

  @Get('missions')
  missions(
    @Query('dateDebut') dateDebut: string | undefined,
    @Query('dateFin') dateFin: string | undefined,
    @Query('entiteId') entiteId: string | undefined,
    @Query('responsableId') responsableId: string | undefined,
    @Query('etapeCode') etapeCode: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.missions({ dateDebut, dateFin, entiteId, responsableId, etapeCode }, user);
  }

  @Get('echeances')
  echeances(@Query('horizon') horizon: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.echeances(Number(horizon ?? 30), user);
  }
}
