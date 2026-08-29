import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../administration/permissions/permissions.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { GedDossier } from './entities/ged-dossier.entity';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentDroit } from './entities/document-droit.entity';
import { DossierDroit } from './entities/dossier-droit.entity';
import { GedVersement } from './entities/ged-versement.entity';
import { GedConsultation } from './entities/ged-consultation.entity';
import { GedDossiersService } from './ged-dossiers.service';
import { GedDossiersController } from './ged-dossiers.controller';
import { GedDocumentsService } from './ged-documents.service';
import { GedDocumentsController } from './ged-documents.controller';
import { GedDroitsService } from './ged-droits.service';
import { GedDroitsController } from './ged-droits.controller';
import { GedVersementsService } from './ged-versements.service';
import { GedVersementsController } from './ged-versements.controller';
import { GedWorkflowService } from './ged-workflow.service';
import { GedWorkflowController } from './ged-workflow.controller';
import { GedRechercheService } from './ged-recherche.service';
import { GedRechercheController } from './ged-recherche.controller';
import { GedConsultationsService } from './ged-consultations.service';
import { GedStorageService } from './ged-storage.service';
import { GedStorageController } from './ged-storage.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GedDossier,
      Document,
      DocumentVersion,
      DocumentDroit,
      DossierDroit,
      GedVersement,
      GedConsultation,
    ]),
    PermissionsModule,
    WorkflowModule,
  ],
  providers: [
    GedDossiersService,
    GedDocumentsService,
    GedDroitsService,
    GedVersementsService,
    GedWorkflowService,
    GedRechercheService,
    GedConsultationsService,
    GedStorageService,
  ],
  controllers: [
    GedDossiersController,
    GedDocumentsController,
    GedDroitsController,
    GedVersementsController,
    GedWorkflowController,
    GedRechercheController,
    GedStorageController,
  ],
  exports: [GedDocumentsService, GedVersementsService, GedStorageService],
})
export class GedModule {}
