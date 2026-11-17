import { Controller, ForbiddenException, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { MarchesAccesService } from './marches-acces.service';
import { MarchesNotificationsService } from '../marches-notifications.service';

// Droits de l'utilisateur sur le module Marchés (cellule de passation) : sert
// à l'interface pour afficher ou masquer les actions.
@Controller('marches-acces')
export class MarchesAccesController {
  constructor(
    private readonly acces: MarchesAccesService,
    private readonly notifications: MarchesNotificationsService,
  ) {}

  @Get()
  async moi(@CurrentUser() user: AuthenticatedUser) {
    const a = await this.acces.acces(user);
    return { ...a, parametrage: await this.acces.peutParametrer(user) };
  }

  @Post('recapitulatif')
  async recapitulatif(@CurrentUser() user: AuthenticatedUser) {
    if (!(await this.acces.acces(user)).membre) {
      throw new ForbiddenException('Réservé aux membres de la cellule de passation des marchés');
    }
    const n = await this.notifications.envoyerRecapitulatifMaintenant(user.organisationId);
    return { destinataires: n };
  }
}
