import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { UtilisateursModule } from './administration/utilisateurs/utilisateurs.module';
import { OrganisationsModule } from './administration/organisations/organisations.module';
import { EntitesModule } from './administration/entites/entites.module';
import { FonctionsModule } from './administration/fonctions/fonctions.module';
import { RolesModule } from './administration/roles/roles.module';
import { PermissionsModule } from './administration/permissions/permissions.module';
import { DelegationsModule } from './administration/delegations/delegations.module';
import { ParametrageModule } from './administration/parametrage/parametrage.module';
import { WorkflowModule } from './workflow/workflow.module';
import { CourrierModule } from './courrier/courrier.module';
import { AuditModule } from './audit/audit.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    ScheduleModule.forRoot(),
    AuthModule,
    UtilisateursModule,
    OrganisationsModule,
    EntitesModule,
    FonctionsModule,
    RolesModule,
    PermissionsModule,
    DelegationsModule,
    ParametrageModule,
    WorkflowModule,
    CourrierModule,
    AuditModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
