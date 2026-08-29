import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GedRechercheService } from './ged-recherche.service';

@Controller('ged/recherche')
export class GedRechercheController {
  constructor(private readonly rechercheService: GedRechercheService) {}

  @Get('comptage-par-dossier')
  comptageParDossier(@CurrentUser() user: AuthenticatedUser) {
    return this.rechercheService.compterParDossier(user);
  }

  @Get()
  rechercher(
    @CurrentUser() user: AuthenticatedUser,
    @Query('texte') texte?: string,
    @Query('dossierId') dossierId?: string,
    @Query('confidentialiteValeurId') confidentialiteValeurId?: string,
    @Query('seulementNonClasses') seulementNonClasses?: string,
    @Query('limite') limite?: string,
    @Query('decalage') decalage?: string,
  ) {
    return this.rechercheService.rechercher(
      {
        texte,
        dossierId,
        confidentialiteValeurId,
        seulementNonClasses: seulementNonClasses === 'true',
        limite: limite ? Number(limite) : undefined,
        decalage: decalage ? Number(decalage) : undefined,
      },
      user,
    );
  }
}
