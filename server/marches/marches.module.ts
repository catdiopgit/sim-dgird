import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from '../administration/permissions/permissions.module';
import { Entite } from '../administration/entites/entities/entite.entity';
import { GedModule } from '../ged/ged.module';
import { Document } from '../ged/entities/document.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TypeMarche } from './entities/type-marche.entity';
import { PhaseTypeMarche } from './entities/phase-type-marche.entity';
import { Marche } from './entities/marche.entity';
import { PhaseMarche } from './entities/phase-marche.entity';
import { MarcheCandidat } from './entities/marche-candidat.entity';
import { MarcheAttribution } from './entities/marche-attribution.entity';
import { TypesMarcheService } from './types-marche.service';
import { TypesMarcheController } from './types-marche.controller';
import { PhasesTypeMarcheService } from './phases-type-marche.service';
import { PhasesTypeMarcheController } from './phases-type-marche.controller';
import { MarchesService } from './marches.service';
import { MarchesController } from './marches.controller';
import { PhasesMarcheService } from './phases-marche.service';
import { PhasesMarcheController } from './phases-marche.controller';
import { MarcheCandidatsService } from './marche-candidats.service';
import { MarcheCandidatsController } from './marche-candidats.controller';
import { MarcheAttributionsService } from './marche-attributions.service';
import { MarcheAttributionsController } from './marche-attributions.controller';
import { MarchesDocumentsService } from './marches-documents.service';
import { MarchesDocumentsController } from './marches-documents.controller';
import { MarchesStatistiquesService } from './marches-statistiques.service';
import { MarchesStatistiquesController } from './marches-statistiques.controller';
import { MarchesRetardsService } from './marches-retards.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TypeMarche,
      PhaseTypeMarche,
      Marche,
      PhaseMarche,
      MarcheCandidat,
      MarcheAttribution,
      Entite,
      Document,
    ]),
    PermissionsModule,
    GedModule,
    NotificationsModule,
  ],
  providers: [
    TypesMarcheService,
    PhasesTypeMarcheService,
    MarchesService,
    PhasesMarcheService,
    MarcheCandidatsService,
    MarcheAttributionsService,
    MarchesDocumentsService,
    MarchesStatistiquesService,
    MarchesRetardsService,
  ],
  controllers: [
    TypesMarcheController,
    PhasesTypeMarcheController,
    MarchesController,
    PhasesMarcheController,
    MarcheCandidatsController,
    MarcheAttributionsController,
    MarchesDocumentsController,
    MarchesStatistiquesController,
  ],
  exports: [MarchesService],
})
export class MarchesModule {}
