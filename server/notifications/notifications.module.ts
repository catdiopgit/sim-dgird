import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { ParametreSmtp } from '../administration/organisations/entities/parametre-smtp.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { RetardsService } from './retards.service';
import { EmailNotificationsService } from './email-notifications.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, ParametreSmtp]), WorkflowModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, RetardsService, EmailNotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
