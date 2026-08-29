import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entite } from './entities/entite.entity';
import { TypeEntite } from './entities/type-entite.entity';
import { EntitesService } from './entites.service';
import { EntitesController } from './entites.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Entite, TypeEntite]), PermissionsModule],
  providers: [EntitesService],
  controllers: [EntitesController],
  exports: [EntitesService],
})
export class EntitesModule {}
