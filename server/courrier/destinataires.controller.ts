import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { DestinatairesService, type AjouterDestinataireData } from './destinataires.service';

class AjouterDestinataireDto implements AjouterDestinataireData {
  @IsUUID() courrierId: string;
  @IsOptional() @IsUUID() entiteId?: string | null;
  @IsOptional() @IsUUID() utilisateurId?: string | null;
  @IsOptional() @IsUUID() contactId?: string | null;
  @IsOptional() @IsIn(['principal', 'copie']) typeDiffusion?: 'principal' | 'copie';
  @IsOptional() @IsString() instruction?: string | null;
  @IsOptional() @IsString() echeance?: string | null;
}

@Controller('courrier')
export class DestinatairesController {
  constructor(private readonly destinatairesService: DestinatairesService) {}

  @Get('courriers/:id/destinataires')
  listByCourrier(@Param('id') courrierId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.destinatairesService.listByCourrier(courrierId, user);
  }

  @Post('destinataires')
  create(@Body() dto: AjouterDestinataireDto, @CurrentUser() user: AuthenticatedUser) {
    return this.destinatairesService.create(dto, user);
  }

  @Delete('destinataires/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.destinatairesService.remove(id, user);
  }

  @Post('destinataires/:id/prise-connaissance')
  marquerPriseConnaissance(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.destinatairesService.marquerPriseConnaissance(id, user);
  }

  @Get('destinataires/:id/actions')
  listActionsDemandees(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.destinatairesService.listActionsDemandees(id, user);
  }
}
