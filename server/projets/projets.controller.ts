import { Body, Controller, Get, Param, Patch, Post, Delete } from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  ProjetsService,
  type CreerProjetData,
  type UpdateProjetData,
} from './projets.service';
import type { OrganismeExecutionType, PorteeVisibiliteProjet } from './entities/projet.entity';

const ORGANISMES: OrganismeExecutionType[] = ['organisation', 'consultant', 'entreprise', 'externe'];
const PORTEES: PorteeVisibiliteProjet[] = ['membres', 'entites', 'agents', 'tous'];

class CreerProjetDto implements CreerProjetData {
  @IsString() code: string;
  @IsString() nom: string;
  @IsOptional() @IsString() description?: string | null;
  @IsUUID() entiteId: string;
  @IsOptional() @IsUUID() responsableId?: string | null;
  @IsOptional() @IsString() financement?: string | null;
  @IsOptional() @IsUUID() coordonnateurId?: string | null;
  @IsOptional() @IsString() lieuExecution?: string | null;
  @IsOptional() @IsString() dateDebut?: string | null;
  @IsOptional() @IsString() dateFinPrevue?: string | null;
  @IsOptional() @IsNumber() budgetPrevu?: number | null;
  @IsOptional() @IsUUID() statutValeurId?: string | null;
  @IsOptional() @IsUUID() prioriteValeurId?: string | null;
  @IsOptional() @IsIn(ORGANISMES) organismeExecutionType?: OrganismeExecutionType;
  @IsOptional() @IsString() organismeExecutionNom?: string | null;
  @IsOptional() @IsUUID() chargeExecutionUtilisateurId?: string | null;
  @IsOptional() @IsUUID() chargeExecutionContactId?: string | null;
  @IsOptional() @IsIn(PORTEES) porteeVisibilite?: PorteeVisibiliteProjet;
}

class UpdateProjetDto implements UpdateProjetData {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() entiteId?: string;
  @IsOptional() @IsUUID() responsableId?: string | null;
  @IsOptional() @IsString() financement?: string | null;
  @IsOptional() @IsUUID() coordonnateurId?: string | null;
  @IsOptional() @IsString() lieuExecution?: string | null;
  @IsOptional() @IsString() dateDebut?: string | null;
  @IsOptional() @IsString() dateFinPrevue?: string | null;
  @IsOptional() @IsNumber() budgetPrevu?: number | null;
  @IsOptional() @IsUUID() statutValeurId?: string | null;
  @IsOptional() @IsUUID() prioriteValeurId?: string | null;
  @IsOptional() @IsIn(ORGANISMES) organismeExecutionType?: OrganismeExecutionType;
  @IsOptional() @IsString() organismeExecutionNom?: string | null;
  @IsOptional() @IsUUID() chargeExecutionUtilisateurId?: string | null;
  @IsOptional() @IsUUID() chargeExecutionContactId?: string | null;
  @IsOptional() @IsIn(PORTEES) porteeVisibilite?: PorteeVisibiliteProjet;
}

class ConfirmerClotureDto {
  @IsOptional() @IsString() commentaire?: string | null;
}

class RejeterClotureDto {
  @IsString() motif: string;
}

@Controller('projets')
export class ProjetsController {
  constructor(private readonly projetsService: ProjetsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.projetsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projetsService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreerProjetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projetsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projetsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projetsService.remove(id, user);
  }

  @Get(':id/historique')
  historique(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projetsService.historique(id, user);
  }

  @Get(':id/cloture/checklist')
  verifierCloture(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projetsService.verifierCloture(id, user);
  }

  @Post(':id/cloture/demander')
  demanderCloture(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projetsService.demanderCloture(id, user);
  }

  @Post(':id/cloture/confirmer')
  confirmerCloture(
    @Param('id') id: string,
    @Body() dto: ConfirmerClotureDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projetsService.confirmerCloture(id, dto.commentaire ?? null, user);
  }

  @Post(':id/cloture/rejeter')
  rejeterCloture(@Param('id') id: string, @Body() dto: RejeterClotureDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projetsService.rejeterCloture(id, dto.motif, user);
  }
}
