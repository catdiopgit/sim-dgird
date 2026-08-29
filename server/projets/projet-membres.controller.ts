import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ProjetMembresService, type AjouterMembreData } from './projet-membres.service';

class AjouterMembreDto implements Omit<AjouterMembreData, 'projetId'> {
  @IsUUID() utilisateurId: string;
  @IsOptional() @IsUUID() roleEquipeValeurId?: string | null;
  @IsOptional() @IsBoolean() peutModifier?: boolean;
}

@Controller('projets/:projetId/membres')
export class ProjetMembresController {
  constructor(private readonly membresService: ProjetMembresService) {}

  @Get()
  findAll(@Param('projetId') projetId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membresService.listActifs(projetId, user);
  }

  @Post()
  ajouter(
    @Param('projetId') projetId: string,
    @Body() dto: AjouterMembreDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membresService.ajouter({ projetId, ...dto }, user);
  }

  @Delete(':id')
  retirer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membresService.retirer(id, user);
  }
}
