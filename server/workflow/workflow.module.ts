import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../administration/permissions/permissions.module';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowDefinitionAssociation } from './entities/workflow-definition-association.entity';
import { WorkflowEtape } from './entities/workflow-etape.entity';
import { WorkflowHistorique } from './entities/workflow-historique.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowTransition } from './entities/workflow-transition.entity';
import { WorkflowTransitionActeur } from './entities/workflow-transition-acteur.entity';
import { WorkflowController } from './workflow.controller';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinition,
      WorkflowDefinitionAssociation,
      WorkflowEtape,
      WorkflowTransition,
      WorkflowTransitionActeur,
      WorkflowInstance,
      WorkflowHistorique,
    ]),
    PermissionsModule,
  ],
  providers: [WorkflowService, WorkflowEngineService],
  controllers: [WorkflowController],
  exports: [WorkflowService, WorkflowEngineService],
})
export class WorkflowModule {}
