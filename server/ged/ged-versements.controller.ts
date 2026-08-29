import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  GedVersementsService,
  type CreerVersementData,
  type ModifierVersementData,
} from './ged-versements.service';

class CreerVersementDto implements CreerVersementData {
  @IsString() objet: string;
  @IsOptional() @IsUUID() entiteId?: string | null;
  @IsOptional() @IsUUID() dossierCibleId?: string | null;
  @IsOptional() @IsString() description?: string | null;
}

class ModifierVersementDto implements ModifierVersementData {
  @IsOptional() @IsString() objet?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() entiteId?: string | null;
  @IsOptional() @IsUUID() dossierCibleId?: string | null;
}

@Controller('ged/versements')
export class GedVersementsController {
  constructor(private readonly versementsService: GedVersementsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('brouillons') brouillons?: string) {
    return this.versementsService.findAll(user, brouillons === 'true');
  }

  @Get('bannette/a-traiter')
  findATraiter(@CurrentUser() user: AuthenticatedUser) {
    return this.versementsService.findATraiter(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.versementsService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreerVersementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.versementsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ModifierVersementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.versementsService.update(id, dto, user);
  }

  @Post(':id/soumettre')
  soumettre(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.versementsService.soumettre(id, user);
  }
}
