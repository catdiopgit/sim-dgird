import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type { TypeActionCourrier } from '../workflow/entities/workflow-transition.entity';
import { CourrierWorkflowService, type ImputerCourrierData } from './courrier-workflow.service';

const TYPES_ACTION: TypeActionCourrier[] = ['imputation', 'affectation', 'transmission', 'redirection'];

class ExecuterTransitionDto {
  @IsUUID() transitionId: string;
  @IsOptional() @IsString() commentaire?: string | null;
}

class ImputerCourrierDto implements ImputerCourrierData {
  @IsUUID() entiteId: string;
  @IsOptional() @IsUUID() agentId?: string | null;
  @IsOptional() @IsString() instruction?: string | null;
  @IsOptional() @IsString() echeance?: string | null;
  @IsOptional() @IsUUID() transitionId?: string | null;
  @IsOptional() @IsString() commentaire?: string | null;
  @IsOptional() @IsIn(TYPES_ACTION) typeAction?: TypeActionCourrier | null;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) entitesCopieIds?: string[] | null;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) actionsDemandeesIds?: string[] | null;
  @IsOptional() @IsUUID() prioriteValeurId?: string | null;
}

@Controller('courrier')
export class CourrierWorkflowController {
  constructor(private readonly courrierWorkflowService: CourrierWorkflowService) {}

  @Get('courriers/:id/transitions-disponibles')
  transitionsDisponibles(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.courrierWorkflowService.transitionsDisponibles(id, user);
  }

  @Post('courriers/:id/transition')
  executerTransition(@Param('id') id: string, @Body() dto: ExecuterTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.courrierWorkflowService.executerTransition(id, dto.transitionId, dto.commentaire ?? null, user);
  }

  @Post('courriers/:id/imputer')
  imputer(@Param('id') id: string, @Body() dto: ImputerCourrierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.courrierWorkflowService.imputerCourrier(id, dto, user);
  }

  @Get('entites-imputables')
  entitesImputables(@CurrentUser() user: AuthenticatedUser) {
    return this.courrierWorkflowService.entitesImputables(user);
  }

  @Get('entites-transmissibles')
  entitesTransmissibles(@CurrentUser() user: AuthenticatedUser) {
    return this.courrierWorkflowService.entitesTransmissibles(user);
  }

  @Get('personnes-transmissibles')
  personnesTransmissibles(@CurrentUser() user: AuthenticatedUser) {
    return this.courrierWorkflowService.personnesTransmissibles(user);
  }
}
