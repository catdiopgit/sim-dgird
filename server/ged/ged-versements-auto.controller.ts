import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsIn } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GedVersementsAutoService, type ModuleVerse } from './ged-versements-auto.service';

class PeriodeDto {
  @IsDateString() debut: string;
  @IsDateString() fin: string;
  @IsArray() @ArrayNotEmpty() @IsIn(['courrier', 'projet', 'marche'], { each: true }) modules: ModuleVerse[];
}

class ParametreDto {
  @IsBoolean() annuelActif: boolean;
}

@Controller('ged')
export class GedVersementsAutoController {
  constructor(private readonly service: GedVersementsAutoService) {}

  @Post('versements-auto/apercu')
  apercu(@CurrentUser() user: AuthenticatedUser, @Body() dto: PeriodeDto) {
    return this.service.apercu(user, dto.debut.slice(0, 10), dto.fin.slice(0, 10), dto.modules);
  }

  @Post('versements-auto/lancer')
  lancer(@CurrentUser() user: AuthenticatedUser, @Body() dto: PeriodeDto) {
    return this.service.lancer(user, dto.debut.slice(0, 10), dto.fin.slice(0, 10), dto.modules);
  }

  @Get('versements-auto/lancements')
  lancements(@CurrentUser() user: AuthenticatedUser) {
    return this.service.lancements(user);
  }

  @Get('versements-auto/parametre')
  parametre(@CurrentUser() user: AuthenticatedUser) {
    return this.service.parametre(user);
  }

  @Put('versements-auto/parametre')
  definirParametre(@CurrentUser() user: AuthenticatedUser, @Body() dto: ParametreDto) {
    return this.service.definirParametre(user, dto.annuelActif);
  }

  @Get('versements/:id/elements')
  elements(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.elementsDuVersement(id, user);
  }

  @Get('elements-verses')
  statut(@CurrentUser() user: AuthenticatedUser, @Query('type') type: string, @Query('id') id: string) {
    return this.service.statutElement(type, id, user);
  }
}
