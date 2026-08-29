import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  AvenantsService,
  type AvenantLivrableEntree,
  type CreerAvenantData,
  type UpdateAvenantData,
} from './avenants.service';
import type { TypeImpactAvenant } from './entities/avenant-livrable.entity';

const TYPES_IMPACT: TypeImpactAvenant[] = ['cree', 'modifie', 'supprime'];

class CreerAvenantDto implements Omit<CreerAvenantData, 'projetId'> {
  @IsString() reference: string;
  @IsOptional() @IsString() dateAvenant?: string;
  @IsString() objet: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() motif?: string | null;
  @IsOptional() @IsNumber() montant?: number | null;
  @IsOptional() @IsString() dureeInitiale?: string | null;
  @IsOptional() @IsString() nouvelleDuree?: string | null;
  @IsOptional() @IsString() dateDebut?: string | null;
  @IsOptional() @IsString() nouvelleDateFin?: string | null;
  @IsOptional() @IsString() observations?: string | null;
}

class UpdateAvenantDto implements UpdateAvenantData {
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() dateAvenant?: string;
  @IsOptional() @IsString() objet?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() motif?: string | null;
  @IsOptional() @IsNumber() montant?: number | null;
  @IsOptional() @IsString() dureeInitiale?: string | null;
  @IsOptional() @IsString() nouvelleDuree?: string | null;
  @IsOptional() @IsString() dateDebut?: string | null;
  @IsOptional() @IsString() nouvelleDateFin?: string | null;
  @IsOptional() @IsString() observations?: string | null;
}

class AvenantLivrableEntreeDto implements AvenantLivrableEntree {
  @IsOptional() @IsUUID() livrableId: string | null;
  @IsIn(TYPES_IMPACT) typeImpact: TypeImpactAvenant;
  @IsOptional() @IsBoolean() echeanceModifiee?: boolean;
  @IsOptional() @IsBoolean() contenuModifie?: boolean;
  @IsOptional() @IsString() commentaire?: string | null;
}

class DefinirLivrablesImpactesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvenantLivrableEntreeDto)
  entrees: AvenantLivrableEntreeDto[];
}

@Controller('projets/:projetId/avenants')
export class AvenantsController {
  constructor(private readonly avenantsService: AvenantsService) {}

  @Get()
  findAll(@Param('projetId') projetId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.avenantsService.findAll(projetId, user);
  }

  @Post()
  create(
    @Param('projetId') projetId: string,
    @Body() dto: CreerAvenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.avenantsService.create({ projetId, ...dto }, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAvenantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.avenantsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.avenantsService.remove(id, user);
  }

  @Get(':id/livrables')
  listLivrables(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.avenantsService.listLivrablesImpactes(id, user);
  }

  @Post(':id/livrables')
  ajouterLivrable(
    @Param('id') id: string,
    @Body() dto: AvenantLivrableEntreeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.avenantsService.ajouterLivrableImpacte(id, dto, user);
  }

  @Put(':id/livrables')
  definirLivrables(
    @Param('id') id: string,
    @Body() dto: DefinirLivrablesImpactesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.avenantsService.definirLivrablesImpactes(id, dto.entrees, user);
  }

  @Delete('livrables/:ligneId')
  retirerLivrable(@Param('ligneId') ligneId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.avenantsService.retirerLivrableImpacte(ligneId, user);
  }
}
