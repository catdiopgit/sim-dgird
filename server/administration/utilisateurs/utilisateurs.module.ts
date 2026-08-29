import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { Role } from './entities/role.entity';
import { UtilisateurRole } from './entities/utilisateur-role.entity';
import { UtilisateursService } from './utilisateurs.service';
import { UtilisateursController } from './utilisateurs.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, Role, UtilisateurRole]), PermissionsModule],
  providers: [UtilisateursService],
  controllers: [UtilisateursController],
  exports: [UtilisateursService],
})
export class UtilisateursModule {}
