import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delegation } from './entities/delegation.entity';
import { DelegationsService } from './delegations.service';
import { DelegationsController } from './delegations.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Delegation]), PermissionsModule],
  providers: [DelegationsService],
  controllers: [DelegationsController],
  exports: [DelegationsService],
})
export class DelegationsModule {}
