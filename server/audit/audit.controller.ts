import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PermissionsGuard } from '../administration/permissions/permissions.guard';
import { RequirePermission } from '../administration/permissions/require-permission.decorator';
import { AuditService } from './audit.service';

@Controller('administration/journal-audit')
@UseGuards(PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('administration', 'consulter')
  list(@CurrentUser() user: AuthenticatedUser, @Query('objetType') objetType?: string) {
    return this.auditService.list(user.organisationId, { objetType });
  }
}
