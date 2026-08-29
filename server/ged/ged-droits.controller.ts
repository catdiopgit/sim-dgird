import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GedDroitsService, type OctroyerDroitData } from './ged-droits.service';

class OctroyerDroitDto implements OctroyerDroitData {
  @IsString() actionCode: string;
  @IsOptional() @IsUUID() roleId?: string | null;
  @IsOptional() @IsUUID() utilisateurId?: string | null;
  @IsOptional() @IsUUID() entiteId?: string | null;
}

@Controller('ged')
export class GedDroitsController {
  constructor(private readonly droitsService: GedDroitsService) {}

  @Get('documents/:id/droits')
  listPourDocument(@Param('id') documentId: string) {
    return this.droitsService.listPourDocument(documentId);
  }

  @Post('documents/:id/droits')
  octroyerPourDocument(
    @Param('id') documentId: string,
    @Body() dto: OctroyerDroitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.droitsService.octroyerPourDocument(documentId, dto, user);
  }

  @Delete('documents/droits/:id')
  revoquerPourDocument(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.droitsService.revoquerPourDocument(id, user);
  }

  @Get('dossiers/:id/droits')
  listPourDossier(@Param('id') dossierId: string) {
    return this.droitsService.listPourDossier(dossierId);
  }

  @Post('dossiers/:id/droits')
  octroyerPourDossier(
    @Param('id') dossierId: string,
    @Body() dto: OctroyerDroitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.droitsService.octroyerPourDossier(dossierId, dto, user);
  }

  @Delete('dossiers/droits/:id')
  revoquerPourDossier(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.droitsService.revoquerPourDossier(id, user);
  }
}
