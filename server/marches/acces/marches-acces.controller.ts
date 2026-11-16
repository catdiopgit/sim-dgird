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
  async moi(@CurrentUser() user: AuthenticatedUser) {
    const a = await this.acces.acces(user);
    return { ...a, parametrage: await this.acces.peutParametrer(user) };
  }
}
