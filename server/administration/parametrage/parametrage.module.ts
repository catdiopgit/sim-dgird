import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListeValeur } from './entities/liste-valeur.entity';
import { ValeurListe } from './entities/valeur-liste.entity';
import { RegleNumerotation } from './entities/regle-numerotation.entity';
import { ParametrageService } from './parametrage.service';
import { ParametrageController } from './parametrage.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([ListeValeur, ValeurListe, RegleNumerotation]), PermissionsModule],
  providers: [ParametrageService],
  controllers: [ParametrageController],
  exports: [ParametrageService],
})
export class ParametrageModule {}
