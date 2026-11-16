import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MarchesAccesService } from './acces/marches-acces.service';
import { TypesMarcheService, type CreerTypeMarcheData, type UpdateTypeMarcheData } from './types-marche.service';

class CreerTypeMarcheDto implements CreerTypeMarcheData {
  @IsString() code: string;
  @IsString() libelle: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsInt() ordre?: number;
}

class UpdateTypeMarcheDto implements UpdateTypeMarcheData {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsInt() ordre?: number;
  @IsOptional() @IsBoolean() actif?: boolean;
}

@Controller('marches/types')
export class TypesMarcheController {
  constructor(
    private readonly typesMarcheService: TypesMarcheService,
    private readonly acces: MarchesAccesService,
  ) {}

  // Recette 2026-11 : lecture ouverte (référentiel nécessaire pour créer un
  // marché) ; écriture réservée à la cellule et aux administrateurs.
  private async assertParametrage(user: AuthenticatedUser): Promise<void> {
    if (!(await this.acces.peutParametrer(user))) {
      throw new ForbiddenException(
        'Seuls les membres de la cellule de passation des marchés et les administrateurs paramètrent les types de marché',
      );
    }
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.typesMarcheService.findAll(user.organisationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.typesMarcheService.findOne(id, user.organisationId);
  }

  @Post()
  async create(@Body() dto: CreerTypeMarcheDto, @CurrentUser() user: AuthenticatedUser) {
    await this.assertParametrage(user);
    return this.typesMarcheService.create(user.organisationId, dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTypeMarcheDto, @CurrentUser() user: AuthenticatedUser) {
    await this.assertParametrage(user);
    return this.typesMarcheService.update(id, user.organisationId, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.assertParametrage(user);
    return this.typesMarcheService.remove(id, user.organisationId);
  }
}
