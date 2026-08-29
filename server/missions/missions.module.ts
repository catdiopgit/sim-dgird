import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../administration/permissions/permissions.module';
import { ParametrageModule } from '../administration/parametrage/parametrage.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { GedModule } from '../ged/ged.module';
import { Document } from '../ged/entities/document.entity';
import { Mission } from './entities/mission.entity';
import { MissionParticipant } from './entities/mission-participant.entity';
import { MissionActionSuivi } from './entities/mission-action-suivi.entity';
import { MissionDepense } from './entities/mission-depense.entity';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { MissionsWorkflowService } from './missions-workflow.service';
import { MissionParticipantsService } from './mission-participants.service';
import { MissionParticipantsController } from './mission-participants.controller';
import { MissionActionsSuiviService } from './mission-actions-suivi.service';
import { MissionActionsSuiviController } from './mission-actions-suivi.controller';
import { MissionDepensesService } from './mission-depenses.service';
import { MissionDepensesController } from './mission-depenses.controller';
import { MissionsDocumentsService } from './missions-documents.service';
import { MissionsDocumentsController } from './missions-documents.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mission, MissionParticipant, MissionActionSuivi, MissionDepense, Document]),
    PermissionsModule,
    ParametrageModule,
    WorkflowModule,
    GedModule,
  ],
  providers: [
    MissionsService,
    MissionsWorkflowService,
    MissionParticipantsService,
    MissionActionsSuiviService,
    MissionDepensesService,
    MissionsDocumentsService,
  ],
  controllers: [
    MissionsController,
    MissionParticipantsController,
    MissionActionsSuiviController,
    MissionDepensesController,
    MissionsDocumentsController,
  ],
  exports: [MissionsService],
})
export class MissionsModule {}
