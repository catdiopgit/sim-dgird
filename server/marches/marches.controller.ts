import { Body, Controller, Delete, Get, Logger, Param, Patch, Post } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MarchesService, type CreerMarcheData, type UpdateMarcheData } from './marches.service';
import { PhasesMarcheService } from './phases-marche.service';

class CreerMarcheDto implements CreerMarcheData {
  @IsString() reference: string;
  @IsString() objet: string;
  @IsOptional() @IsString() description?: string | null;
  @IsUUID() entiteId: string;
  @IsUUID() typeMarcheId: string;
  @IsOptional() @IsUUID() responsableId?: string | null;
  @IsOptional() @IsString() dateDebutPrevue?: string | null;
  @IsOptional() @IsString() dateFinPrevue?: string | null;
  @IsOptional() @IsNumber() montantEstimatif?: number | null;
  @IsOptional() @IsString() observations?: string | null;
}

class UpdateMarcheDto implements UpdateMarcheData {
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() objet?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() entiteId?: string;
  @IsOptional() @IsUUID() typeMarcheId?: string;
  @IsOptional() @IsUUID() responsableId?: string | null;
  @IsOptional() @IsString() dateDebutPrevue?: string | null;
  @IsOptional() @IsString() dateFinPrevue?: string | null;
  @IsOptional() @IsNumber() montantEstimatif?: number | null;
  @IsOptional() @IsString() observations?: string | null;
}

@Controller('marches')
export class MarchesController {
  private readonly logger = new Logger(MarchesController.name);

  constructor(
    private readonly marchesService: MarchesService,
    private readonly phasesMarcheService: PhasesMarcheService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.marchesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.marchesService.findOne(id, user);
  }

  // §10 : planifie automatiquement les phases dès qu'un type de marché et une
  // date de début prévisionnelle sont renseignés à la création. Échec de
  // planification (ex. type sans phase paramétrée) non bloquant pour la
  // création du marché — l'utilisateur pourra relancer "Planifier" depuis
  // l'onglet Phases une fois le paramétrage corrigé.
  @Post()
  async create(@Body() dto: CreerMarcheDto, @CurrentUser() user: AuthenticatedUser) {
    const marche = await this.marchesService.create(dto, user);
    if (marche.dateDebutPrevue) {
      try {
        await this.phasesMarcheService.planifier(marche.id, user);
      } catch (err) {
        this.logger.warn(`Planification automatique impossible pour le marché ${marche.id} : ${String(err)}`);
      }
    }
    return this.marchesService.findOne(marche.id, user);
  }

  // §10 : recalcule la planification si la date de début prévisionnelle change.
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMarcheDto, @CurrentUser() user: AuthenticatedUser) {
    const marche = await this.marchesService.update(id, dto, user);
    if (dto.dateDebutPrevue !== undefined && marche.dateDebutPrevue) {
      try {
        await this.phasesMarcheService.planifier(id, user);
      } catch (err) {
        this.logger.warn(`Replanification impossible pour le marché ${id} : ${String(err)}`);
      }
    }
    return this.marchesService.findOne(id, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.marchesService.remove(id, user);
  }

  @Get(':id/verifier-cloture')
  verifierCloture(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.marchesService.verifierCloture(id, user);
  }

  @Post(':id/cloturer')
  cloturer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.marchesService.cloturer(id, user);
  }
}
