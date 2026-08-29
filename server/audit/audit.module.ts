import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalAudit } from '../common/entities/journal-audit.entity';
import { PermissionsModule } from '../administration/permissions/permissions.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [TypeOrmModule.forFeature([JournalAudit]), PermissionsModule],
  providers: [AuditService],
  controllers: [AuditController],
})
export class AuditModule {}
