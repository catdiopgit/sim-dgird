import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Bannette, CourriersService, type CreerCourrierData, type UpdateCourrierData } from './courriers.service';
import type { SensCourrier } from './entities/courrier.entity';

const SENS: SensCourrier[] = ['entrant', 'sortant', 'interne'];

class CreerCourrierDto implements CreerCourrierData {
  @IsIn(SENS) sens: SensCourrier;
  @IsString() objet: string;
  @IsOptional() @IsUUID() entiteId?: string | null;
  @IsOptional() @IsUUID() typeValeurId?: string | null;
  @IsOptional() @IsUUID() prioriteValeurId?: string | null;
  @IsOptional() @IsUUID() confidentialiteValeurId?: string | null;
  @IsOptional() @IsUUID() modeTransmissionValeurId?: string | null;
  @IsOptional() @IsDateString() dateCourrier?: string | null;
  @IsOptional() @IsDateString() dateReception?: string | null;
  @IsOptional() @IsDateString() dateEnvoi?: string | null;
  @IsOptional() @IsString() expediteurNom?: string | null;
  @IsOptional() @IsUUID() expediteurTypeValeurId?: string | null;
  @IsOptional() @IsString() destinataireTexte?: string | null;
  @IsOptional() @IsUUID() entiteDestinataireId?: string | null;
  @IsOptional() @IsUUID() agentDestinataireId?: string | null;
  @IsOptional() @IsUUID() contactDestinataireId?: string | null;
  @IsOptional() @IsUUID() statutReceptionValeurId?: string | null;
  @IsOptional() @IsUUID() expediteurContactId?: string | null;
  @IsOptional() @IsString() referenceExpediteur?: string | null;
  @IsOptional() @IsString() observations?: string | null;
}

class UpdateCourrierDto implements UpdateCourrierData {
  @IsOptional() @IsString() objet?: string;
  @IsOptional() @IsUUID() typeValeurId?: string | null;
  @IsOptional() @IsUUID() prioriteValeurId?: string | null;
  @IsOptional() @IsUUID() confidentialiteValeurId?: string | null;
  @IsOptional() @IsUUID() modeTransmissionValeurId?: string | null;
  @IsOptional() @IsDateString() dateCourrier?: string;
  @IsOptional() @IsDateString() dateReception?: string | null;
  @IsOptional() @IsDateString() dateEnvoi?: string | null;
  @IsOptional() @IsString() expediteurNom?: string | null;
  @IsOptional() @IsUUID() expediteurTypeValeurId?: string | null;
  @IsOptional() @IsString() destinataireTexte?: string | null;
  @IsOptional() @IsUUID() entiteDestinataireId?: string | null;
  @IsOptional() @IsUUID() agentDestinataireId?: string | null;
  @IsOptional() @IsString() observations?: string | null;
}

const BANNETTES: Bannette[] = ['a_traiter', 'en_retard', 'archives', 'sortants', 'en_copie', 'clotures'];

@Controller('courrier/courriers')
export class CourriersController {
  constructor(private readonly courriersService: CourriersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('sens') sens?: SensCourrier, @Query('recherche') recherche?: string) {
    return this.courriersService.findAll(user, { sens, recherche });
  }

  @Get('bannettes/:bannette')
  findBannette(
    @Param('bannette', new ParseEnumPipe(BANNETTES)) bannette: Bannette,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.courriersService.findBannette(bannette, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.courriersService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreerCourrierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.courriersService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCourrierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.courriersService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.courriersService.remove(id, user);
  }

  @Get(':id/audit')
  audit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.courriersService.journalAuditCourrier(id, user);
  }

  @Get(':id/workflow-instance')
  workflowInstance(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.courriersService.getWorkflowInstance(id, user);
  }

  @Get(':id/historique')
  historique(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.courriersService.getWorkflowHistorique(id, user);
  }
}
