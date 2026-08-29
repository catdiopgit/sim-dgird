import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GedWorkflowService } from './ged-workflow.service';

class ExecuterTransitionDto {
  @IsUUID() transitionId: string;
  @IsOptional() @IsString() commentaire?: string | null;
}

@Controller('ged/versements')
export class GedWorkflowController {
  constructor(private readonly workflowService: GedWorkflowService) {}

  @Get(':id/transitions-disponibles')
  transitionsDisponibles(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflowService.transitionsDisponibles(id, user);
  }

  @Post(':id/transition')
  executerTransition(@Param('id') id: string, @Body() dto: ExecuterTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workflowService.executerTransition(id, dto.transitionId, dto.commentaire ?? null, user);
  }

  @Get(':id/workflow-instance')
  workflowInstance(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflowService.getWorkflowInstance(id, user);
  }

  @Get(':id/historique')
  historique(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflowService.getWorkflowHistorique(id, user);
  }
}
