import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../administration/permissions/permissions.module';
import { OrganisationsModule } from '../administration/organisations/organisations.module';
import { ParametrageModule } from '../administration/parametrage/parametrage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { Contact } from './entities/contact.entity';
import { Courrier } from './entities/courrier.entity';
import { CourrierDestinataire } from './entities/courrier-destinataire.entity';
import { CourrierDestinataireAction } from './entities/courrier-destinataire-action.entity';
import { CourrierPieceJointe } from './entities/courrier-piece-jointe.entity';
import { CourriersService } from './courriers.service';
import { CourriersController } from './courriers.controller';
import { CourrierWorkflowService } from './courrier-workflow.service';
import { CourrierWorkflowController } from './courrier-workflow.controller';
import { CourrierStorageService } from './courrier-storage.service';
import { CourrierStorageController } from './courrier-storage.controller';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { DestinatairesService } from './destinataires.service';
import { DestinatairesController } from './destinataires.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Courrier, CourrierDestinataire, CourrierDestinataireAction, CourrierPieceJointe, Contact]),
    PermissionsModule,
    OrganisationsModule,
    ParametrageModule,
    NotificationsModule,
    WorkflowModule,
  ],
  providers: [CourriersService, CourrierWorkflowService, CourrierStorageService, ContactsService, DestinatairesService],
  controllers: [
    CourriersController,
    CourrierWorkflowController,
    CourrierStorageController,
    ContactsController,
    DestinatairesController,
  ],
  exports: [CourriersService, CourrierWorkflowService, CourrierStorageService],
})
export class CourrierModule {}
