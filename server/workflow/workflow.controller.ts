import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PermissionsGuard } from '../administration/permissions/permissions.guard';
import { RequirePermission } from '../administration/permissions/require-permission.decorator';
import { WorkflowService } from './workflow.service';
import type { TypeEtapeWorkflow } from './entities/workflow-etape.entity';
import type { TypeActionCourrier } from './entities/workflow-transition.entity';
import type { TypeActeurWorkflow } from './entities/workflow-transition-acteur.entity';

const TYPES_ETAPE: TypeEtapeWorkflow[] = ['initiale', 'intermediaire', 'finale', 'rejet'];
const TYPES_ACTION_COURRIER: TypeActionCourrier[] = ['imputation', 'affectation', 'transmission', 'redirection'];
const TYPES_ACTEUR: TypeActeurWorkflow[] = [
  'role',
  'fonction',
  'entite',
  'entite_et_descendants',
  'utilisateur',
  'responsable_entite_courante',
  'superieur_hierarchique_courant',
];

class UpsertDefinitionDto {
  @IsOptional() @IsUUID() organisationId?: string;
  @IsOptional() @IsUUID() moduleId?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsBoolean() actif?: boolean;
}

class UpsertEtapeDto {
  @IsOptional() @IsUUID() workflowDefinitionId?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsInt() ordre?: number;
  @IsOptional() @IsIn(TYPES_ETAPE) typeEtape?: TypeEtapeWorkflow;
  @IsOptional() @IsInt() delaiJours?: number | null;
  @IsOptional() @IsString() couleur?: string | null;
  @IsOptional() @IsInt() positionX?: number | null;
  @IsOptional() @IsInt() positionY?: number | null;
}

class UpsertTransitionDto {
  @IsOptional() @IsUUID() workflowDefinitionId?: string;
  @IsOptional() @IsUUID() etapeSourceId?: string | null;
  @IsOptional() @IsUUID() etapeCibleId?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelleAction?: string;
  @IsOptional() condition?: Record<string, unknown> | null;
  @IsOptional() @IsIn(TYPES_ACTION_COURRIER) typeAction?: TypeActionCourrier | null;
}

class CreateActeurDto {
  @IsUUID() workflowTransitionId: string;
  @IsOptional() @IsIn(TYPES_ACTEUR) typeActeur?: TypeActeurWorkflow;
  @IsOptional() @IsUUID() roleId?: string | null;
  @IsOptional() @IsUUID() fonctionId?: string | null;
  @IsOptional() @IsUUID() entiteId?: string | null;
  @IsOptional() @IsUUID() utilisateurId?: string | null;
}

class CreateAssociationDto {
  @IsUUID() workflowDefinitionId: string;
  @IsUUID() valeurListeId: string;
}

@Controller('administration/workflows')
@UseGuards(PermissionsGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  // --- Définitions ---

  @Get('definitions')
  @RequirePermission('administration', 'consulter')
  findDefinitions(@CurrentUser() user: AuthenticatedUser, @Query('moduleId') moduleId?: string) {
    return this.workflowService.findDefinitions(user.organisationId, moduleId);
  }

  @Get('definitions/:id')
  @RequirePermission('administration', 'consulter')
  findDefinition(@Param('id') id: string) {
    return this.workflowService.findDefinition(id);
  }

  @Post('definitions')
  @RequirePermission('administration', 'creer')
  createDefinition(@Body() dto: UpsertDefinitionDto) {
    return this.workflowService.createDefinition(dto);
  }

  @Patch('definitions/:id')
  @RequirePermission('administration', 'modifier')
  updateDefinition(@Param('id') id: string, @Body() dto: UpsertDefinitionDto) {
    return this.workflowService.updateDefinition(id, dto);
  }

  @Delete('definitions/:id')
  @RequirePermission('administration', 'modifier')
  removeDefinition(@Param('id') id: string) {
    return this.workflowService.removeDefinition(id);
  }

  @Post('definitions/:id/definir-defaut')
  @RequirePermission('administration', 'modifier')
  definirDefaut(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflowService.definirDefaut(id, user.organisationId);
  }

  // --- Étapes ---

  @Get('definitions/:id/etapes')
  @RequirePermission('administration', 'consulter')
  findEtapes(@Param('id') workflowDefinitionId: string) {
    return this.workflowService.findEtapes(workflowDefinitionId);
  }

  @Post('etapes')
  @RequirePermission('administration', 'creer')
  createEtape(@Body() dto: UpsertEtapeDto) {
    return this.workflowService.createEtape(dto);
  }

  @Patch('etapes/:id')
  @RequirePermission('administration', 'modifier')
  updateEtape(@Param('id') id: string, @Body() dto: UpsertEtapeDto) {
    return this.workflowService.updateEtape(id, dto);
  }

  @Delete('etapes/:id')
  @RequirePermission('administration', 'modifier')
  removeEtape(@Param('id') id: string) {
    return this.workflowService.removeEtape(id);
  }

  // --- Transitions ---

  @Get('definitions/:id/transitions')
  @RequirePermission('administration', 'consulter')
  findTransitions(@Param('id') workflowDefinitionId: string) {
    return this.workflowService.findTransitions(workflowDefinitionId);
  }

  @Post('transitions')
  @RequirePermission('administration', 'creer')
  createTransition(@Body() dto: UpsertTransitionDto) {
    return this.workflowService.createTransition(dto);
  }

  @Patch('transitions/:id')
  @RequirePermission('administration', 'modifier')
  updateTransition(@Param('id') id: string, @Body() dto: UpsertTransitionDto) {
    return this.workflowService.updateTransition(id, dto);
  }

  @Delete('transitions/:id')
  @RequirePermission('administration', 'modifier')
  removeTransition(@Param('id') id: string) {
    return this.workflowService.removeTransition(id);
  }

  // --- Acteurs de transition ---

  @Get('transitions/:id/acteurs')
  @RequirePermission('administration', 'consulter')
  findActeurs(@Param('id') transitionId: string) {
    return this.workflowService.findActeurs(transitionId);
  }

  @Post('acteurs')
  @RequirePermission('administration', 'creer')
  createActeur(@Body() dto: CreateActeurDto) {
    return this.workflowService.createActeur(dto);
  }

  @Delete('acteurs/:id')
  @RequirePermission('administration', 'modifier')
  removeActeur(@Param('id') id: string) {
    return this.workflowService.removeActeur(id);
  }

  // --- Associations définition <-> valeur de liste ---

  @Get('definitions/:id/associations')
  @RequirePermission('administration', 'consulter')
  findAssociations(@Param('id') workflowDefinitionId: string) {
    return this.workflowService.findAssociations(workflowDefinitionId);
  }

  @Post('associations')
  @RequirePermission('administration', 'creer')
  createAssociation(@Body() dto: CreateAssociationDto) {
    return this.workflowService.createAssociation(dto);
  }

  @Delete('associations/:id')
  @RequirePermission('administration', 'modifier')
  removeAssociation(@Param('id') id: string) {
    return this.workflowService.removeAssociation(id);
  }
}
