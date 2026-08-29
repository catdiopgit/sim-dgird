import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../administration/permissions/permissions.module';
import { Entite } from '../administration/entites/entities/entite.entity';
import { GedModule } from '../ged/ged.module';
import { Document } from '../ged/entities/document.entity';
import { Projet } from './entities/projet.entity';
import { ProjetMembre } from './entities/projet-membre.entity';
import { Livrable } from './entities/livrable.entity';
import { Avenant } from './entities/avenant.entity';
import { AvenantLivrable } from './entities/avenant-livrable.entity';
import { ProjetContactExecution } from './entities/projet-contact-execution.entity';
import { Decaissement } from './entities/decaissement.entity';
import { ProjetVisibiliteEntite } from './entities/projet-visibilite-entite.entity';
import { ProjetVisibiliteUtilisateur } from './entities/projet-visibilite-utilisateur.entity';
import { ProjetsService } from './projets.service';
import { ProjetsController } from './projets.controller';
import { ProjetMembresService } from './projet-membres.service';
import { ProjetMembresController } from './projet-membres.controller';
import { LivrablesService } from './livrables.service';
import { LivrablesController } from './livrables.controller';
import { AvenantsService } from './avenants.service';
import { AvenantsController } from './avenants.controller';
import { ContactsExecutionService } from './contacts-execution.service';
import { ContactsExecutionController } from './contacts-execution.controller';
import { DecaissementsService } from './decaissements.service';
import { DecaissementsController } from './decaissements.controller';
import { ProjetVisibiliteService } from './projet-visibilite.service';
import { ProjetVisibiliteController } from './projet-visibilite.controller';
import { ProjetsDocumentsService } from './projets-documents.service';
import { ProjetsDocumentsController } from './projets-documents.controller';

// Tables V1 (phases/activites/taches/projet_risques/projet_problemes/
// projet_decisions/projet_reunions/projet_indicateurs) volontairement non
// portées : dead code applicatif depuis la refonte V2/V3 (aucun hook/service
// frontend n'y touche — voir MIGRATION.md Phase 5). Sous-système d'archivage
// annuel (0082) différé comme prévu (Phase 4).
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Projet,
      ProjetMembre,
      Livrable,
      Avenant,
      AvenantLivrable,
      ProjetContactExecution,
      Decaissement,
      ProjetVisibiliteEntite,
      ProjetVisibiliteUtilisateur,
      Entite,
      Document,
    ]),
    PermissionsModule,
    GedModule,
  ],
  providers: [
    ProjetsService,
    ProjetMembresService,
    LivrablesService,
    AvenantsService,
    ContactsExecutionService,
    DecaissementsService,
    ProjetVisibiliteService,
    ProjetsDocumentsService,
  ],
  controllers: [
    ProjetsController,
    ProjetMembresController,
    LivrablesController,
    AvenantsController,
    ContactsExecutionController,
    DecaissementsController,
    ProjetVisibiliteController,
    ProjetsDocumentsController,
  ],
  exports: [ProjetsService],
})
export class ProjetsModule {}
