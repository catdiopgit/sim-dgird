import { Module } from '@nestjs/common';
import { PermissionsModule } from '../../administration/permissions/permissions.module';
import { MarchesAccesService } from './marches-acces.service';

@Module({
  imports: [PermissionsModule],
  providers: [MarchesAccesService],
  exports: [MarchesAccesService],
})
export class MarchesAccesModule {}
