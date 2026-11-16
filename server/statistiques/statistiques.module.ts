import { Module } from '@nestjs/common';
import { CourrierModule } from '../courrier/courrier.module';
import { MissionsModule } from '../missions/missions.module';
import { ProjetsModule } from '../projets/projets.module';
import { StatistiquesController } from './statistiques.controller';
import { StatistiquesService } from './statistiques.service';

@Module({
  imports: [CourrierModule, ProjetsModule, MissionsModule],
  controllers: [StatistiquesController],
  providers: [StatistiquesService],
})
export class StatistiquesModule {}
