import { Module } from '@nestjs/common';
import { CourrierModule } from '../courrier/courrier.module';
import { MarchesModule } from '../marches/marches.module';
import { ProjetsModule } from '../projets/projets.module';
import { StatistiquesController } from './statistiques.controller';
import { StatistiquesService } from './statistiques.service';

@Module({
  imports: [CourrierModule, ProjetsModule, MarchesModule],
  controllers: [StatistiquesController],
  providers: [StatistiquesService],
})
export class StatistiquesModule {}
