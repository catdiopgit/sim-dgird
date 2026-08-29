import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { OrganisationsService } from './organisations.service';

const TAILLE_MAX_LOGO_OCTETS = 5 * 1024 * 1024; // 5 Mo

class UpsertOrganisationDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() logoUrl?: string | null;
  @IsOptional() @IsString() couleurPrimaire?: string | null;
  @IsOptional() @IsBoolean() actif?: boolean;
}

class DefinirParametreDto {
  @IsString() cle: string;
  valeur: Record<string, unknown>;
  @IsOptional() @IsString() description?: string;
}

class DefinirParametresSmtpDto {
  @IsString() hote: string;
  port: number;
  @IsString() securite: string;
  @IsString() utilisateur: string;
  @IsOptional() @IsString() motDePasse?: string;
  @IsString() adresseExpediteur: string;
  @IsOptional() @IsString() nomExpediteur?: string | null;
  @IsOptional() @IsBoolean() actif?: boolean;
}

@Controller('administration/organisations')
@UseGuards(PermissionsGuard)
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @Get()
  @RequirePermission('administration', 'consulter')
  findAll() {
    return this.organisationsService.findAll();
  }

  // Doit précéder ':id' (routage par ordre de déclaration) : sinon 'branding'
  // serait capturé comme un id d'organisation.
  @Public()
  @Get('branding')
  getBranding() {
    return this.organisationsService.getBranding();
  }

  @Get(':id')
  @RequirePermission('administration', 'consulter')
  findOne(@Param('id') id: string) {
    return this.organisationsService.findOne(id);
  }

  @Post()
  @RequirePermission('administration', 'creer')
  create(@Body() dto: UpsertOrganisationDto) {
    return this.organisationsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('administration', 'modifier')
  update(@Param('id') id: string, @Body() dto: UpsertOrganisationDto) {
    return this.organisationsService.update(id, dto);
  }

  @Get(':id/parametres')
  @RequirePermission('administration', 'consulter')
  listParametres(@Param('id') id: string) {
    return this.organisationsService.listParametres(id);
  }

  @Post(':id/parametres')
  @RequirePermission('administration', 'modifier')
  definirParametre(@Param('id') id: string, @Body() dto: DefinirParametreDto) {
    return this.organisationsService.definirParametre(id, dto.cle, dto.valeur, dto.description);
  }

  @Delete('parametres/:id')
  @RequirePermission('administration', 'modifier')
  deleteParametre(@Param('id') id: string) {
    return this.organisationsService.deleteParametre(id);
  }

  @Post(':id/logo')
  @RequirePermission('administration', 'modifier')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_LOGO_OCTETS } }))
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Fichier requis');
    const url = await this.organisationsService.uploadLogo(id, file);
    return { url };
  }

  @Public()
  @Get(':id/logo')
  async getLogo(@Param('id') id: string, @Res() res: Response) {
    const logo = await this.organisationsService.resoudreLogo(id);
    if (!logo) {
      res.status(404).end();
      return;
    }
    res.type(logo.typeMime);
    res.sendFile(logo.cheminAbsolu);
  }

  @Get(':id/smtp')
  @RequirePermission('administration', 'consulter')
  getParametresSmtp(@Param('id') id: string) {
    return this.organisationsService.getParametresSmtp(id);
  }

  @Post(':id/smtp')
  @RequirePermission('administration', 'modifier')
  definirParametresSmtp(@Param('id') id: string, @Body() dto: DefinirParametresSmtpDto) {
    return this.organisationsService.definirParametresSmtp(id, dto);
  }
}
