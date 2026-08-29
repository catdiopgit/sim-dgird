import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { IsArray, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ProjetVisibiliteService } from './projet-visibilite.service';

class DefinirIdsDto {
  @IsArray() @IsUUID('4', { each: true }) ids: string[];
}

@Controller('projets/:projetId/visibilite')
export class ProjetVisibiliteController {
  constructor(private readonly visibiliteService: ProjetVisibiliteService) {}

  @Get('entites')
  listEntites(@Param('projetId') projetId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visibiliteService.listEntites(projetId, user);
  }

  @Put('entites')
  definirEntites(
    @Param('projetId') projetId: string,
    @Body() dto: DefinirIdsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.visibiliteService.definirEntites(projetId, dto.ids, user);
  }

  @Get('utilisateurs')
  listUtilisateurs(@Param('projetId') projetId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.visibiliteService.listUtilisateurs(projetId, user);
  }

  @Put('utilisateurs')
  definirUtilisateurs(
    @Param('projetId') projetId: string,
    @Body() dto: DefinirIdsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.visibiliteService.definirUtilisateurs(projetId, dto.ids, user);
  }
}
