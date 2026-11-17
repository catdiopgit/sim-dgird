import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organisation } from './entities/organisation.entity';
import { ParametreOrganisation } from './entities/parametre-organisation.entity';
import { ParametreSmtp } from './entities/parametre-smtp.entity';
import { OrganisationsService } from './organisations.service';
import { OrganisationsController } from './organisations.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organisation, ParametreOrganisation, ParametreSmtp]), PermissionsModule, NotificationsModule],
  providers: [OrganisationsService],
  controllers: [OrganisationsController],
  exports: [OrganisationsService],
})
export class OrganisationsModule {}
