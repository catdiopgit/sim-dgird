import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionsService, type CreerMissionData, type UpdateMissionData } from './missions.service';
import { MissionsWorkflowService } from './missions-workflow.service';

class CreerMissionDto implements CreerMissionData {
  @IsUUID() entiteId: string;
  @IsString() objet: string;
  @IsString() dateDepart: string;
  @IsString() dateRetour: string;
  @IsOptional() @IsUUID() responsableId?: string | null;
  @IsOptional() @IsString() lieu?: string | null;
  @IsOptional() @IsString() objectifs?: string | null;
  @IsOptional() @IsString() activitesPrevues?: string | null;
  @IsOptional() @IsNumber() budgetPrevu?: number | null;
}

class UpdateMissionDto implements UpdateMissionData {
  @IsOptional() @IsUUID() entiteId?: string;
  @IsOptional() @IsString() objet?: string;
  @IsOptional() @IsString() dateDepart?: string;
  @IsOptional() @IsString() dateRetour?: string;
  @IsOptional() @IsUUID() responsableId?: string | null;
  @IsOptional() @IsString() lieu?: string | null;
  @IsOptional() @IsString() objectifs?: string | null;
  @IsOptional() @IsString() activitesPrevues?: string | null;
  @IsOptional() @IsNumber() budgetPrevu?: number | null;
  @IsOptional() @IsString() recommandations?: string | null;
}

class ExecuterTransitionDto {
  @IsUUID() transitionId: string;
  @IsOptional() @IsString() commentaire?: string | null;
}

@Controller('missions')
export class MissionsController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly workflowService: MissionsWorkflowService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.missionsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.missionsService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreerMissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.missionsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.missionsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.missionsService.remove(id, user);
  }

  @Get(':id/transitions-disponibles')
  transitionsDisponibles(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflowService.transitionsDisponibles(id, user);
  }

  @Post(':id/transitions')
  executerTransition(
    @Param('id') id: string,
    @Body() dto: ExecuterTransitionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflowService.executerTransition(id, dto.transitionId, dto.commentaire ?? null, user);
  }

  @Get(':id/workflow-instance')
  workflowInstance(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflowService.getWorkflowInstance(id, user);
  }

  @Get(':id/workflow-historique')
  workflowHistorique(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflowService.getWorkflowHistorique(id, user);
  }
}
