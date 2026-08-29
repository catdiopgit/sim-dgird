import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fonction } from './entities/fonction.entity';
import { FonctionsService } from './fonctions.service';
import { FonctionsController } from './fonctions.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Fonction]), PermissionsModule],
  providers: [FonctionsService],
  controllers: [FonctionsController],
  exports: [FonctionsService],
})
export class FonctionsModule {}
