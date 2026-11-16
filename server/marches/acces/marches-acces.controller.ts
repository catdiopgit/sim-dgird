import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { MarchesAccesService } from './marches-acces.service';

// Droits de l'utilisateur sur le module Marchés (cellule de passation) : sert
// à l'interface pour afficher ou masquer les actions.
@Controller('marches-acces')
export class MarchesAccesController {
  constructor(private readonly acces: MarchesAccesService) {}

  @Get()
  moi(@CurrentUser() user: AuthenticatedUser) {
    return this.acces.acces(user);
  }
}
