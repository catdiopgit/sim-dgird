import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { OrganisationsService } from './organisations.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EmailNotificationsService } from '../../notifications/email-notifications.service';
import { validerFichier } from '../../common/fichiers/valider-fichier';

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
  // Pas de décorateur de type ici : `valeur` porte un JSON hétérogène selon la
  // clé (uuid en chaîne, booléen, objet...). @IsOptional() seul suffit à faire
  // survivre le champ au ValidationPipe global (whitelist: true, main.ts) —
  // sans décorateur du tout, class-validator le considère "non whitelisté" et
  // le supprime silencieusement du body avant qu'il n'atteigne le contrôleur,
  // ce qui rendait cet endpoint no-op côté écriture (200 OK sans persister).
  @IsOptional() valeur: unknown;
  @IsOptional() @IsString() description?: string;
}

class TesterSmtpDto {
  @IsOptional() @IsString() urlApplication?: string;
}

class DefinirParametresSmtpDto {
  @IsString() hote: string;
  // v8.5.5 : sans décorateur, le port était retiré par la validation (liste
  // blanche) et restait toujours à 587, quel que soit le port saisi.
  @Type(() => Number) @IsInt() @Min(1) @Max(65535) port: number;
  @IsString() securite: string;
  @IsString() utilisateur: string;
  @IsOptional() @IsString() motDePasse?: string;
  @IsString() adresseExpediteur: string;
  @IsOptional() @IsString() nomExpediteur?: string | null;
  @IsOptional() @IsBoolean() actif?: boolean;
}

// v8.6.6 : une organisation ne peut être modifiée que par ses propres membres.
function memeOrganisation(id: string, user: AuthenticatedUser): void {
  if (id !== user.organisationId) throw new ForbiddenException('Action non autorisée sur une autre organisation');
}

@Controller('administration/organisations')
@UseGuards(PermissionsGuard)
export class OrganisationsController {
  constructor(
    private readonly organisationsService: OrganisationsService,
    private readonly emails: EmailNotificationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

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

  // Sa propre organisation est lisible par tout utilisateur connecté (en-têtes,
  // fiche d'exploitation) ; les autres restent réservées à l'administration
  // multi-organisation via GET / (recette 2026-11).
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (id !== user.organisationId) throw new ForbiddenException('Organisation hors de votre périmètre');
    return this.organisationsService.findOne(id);
  }

  @Post()
  @RequirePermission('administration', 'creer')
  create(@Body() dto: UpsertOrganisationDto) {
    return this.organisationsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('administration', 'modifier')
  update(@Param('id') id: string, @Body() dto: UpsertOrganisationDto, @CurrentUser() user: AuthenticatedUser) {
    memeOrganisation(id, user);
    return this.organisationsService.update(id, dto);
  }

  // Recette 2026-11 : lecture ouverte aux utilisateurs de l'organisation (en-tête
  // des documents imprimés, paramètres du circuit courrier) ; la modification
  // reste réservée à l'administration. Les secrets SMTP sont sur /smtp.
  @Get(':id/parametres')
  listParametres(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (id !== user.organisationId) throw new ForbiddenException('Organisation hors de votre périmètre');
    return this.organisationsService.listParametres(id);
  }

  @Post(':id/parametres')
  @RequirePermission('administration', 'modifier')
  definirParametre(@Param('id') id: string, @Body() dto: DefinirParametreDto, @CurrentUser() user: AuthenticatedUser) {
    memeOrganisation(id, user);
    return this.organisationsService.definirParametre(id, dto.cle, dto.valeur, dto.description);
  }

  @Delete('parametres/:id')
  @RequirePermission('administration', 'modifier')
  async deleteParametre(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const rows: Array<{ organisation_id: string }> = await this.dataSource.query(
      'select organisation_id from parametres_organisation where id = $1',
      [id],
    );
    if (rows[0]) memeOrganisation(rows[0].organisation_id, user);
    return this.organisationsService.deleteParametre(id);
  }

  @Post(':id/logo')
  @RequirePermission('administration', 'modifier')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_LOGO_OCTETS } }))
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthenticatedUser) {
    memeOrganisation(id, user);
    validerFichier(file, { imagesSeulement: true });
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

  @Post(':id/images/:nom')
  @RequirePermission('administration', 'modifier')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_LOGO_OCTETS } }))
  async uploadImage(
    @Param('id') id: string,
    @Param('nom') nom: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    memeOrganisation(id, user);
    validerFichier(file, { imagesSeulement: true });
    if (!file) throw new BadRequestException('Fichier requis');
    const url = await this.organisationsService.uploadImage(id, nom, file);
    return { url };
  }

  @Public()
  @Get(':id/images/:nom')
  async getImage(@Param('id') id: string, @Param('nom') nom: string, @Res() res: Response) {
    const image = await this.organisationsService.resoudreImage(id, nom);
    if (!image) {
      res.status(404).end();
      return;
    }
    res.type(image.typeMime);
    res.sendFile(image.cheminAbsolu);
  }

  @Get(':id/smtp')
  @RequirePermission('administration', 'consulter')
  getParametresSmtp(@Param('id') id: string) {
    return this.organisationsService.getParametresSmtp(id);
  }

  @Post(':id/smtp')
  @RequirePermission('administration', 'modifier')
  definirParametresSmtp(@Param('id') id: string, @Body() dto: DefinirParametresSmtpDto, @CurrentUser() user: AuthenticatedUser) {
    memeOrganisation(id, user);
    return this.organisationsService.definirParametresSmtp(id, dto);
  }

  // v8.5.5 : e-mail de test à l'utilisateur connecté (diagnostic SMTP), et
  // mémorisation de l'adresse de l'application pour les liens des e-mails.
  @Post(':id/smtp/test')
  @RequirePermission('administration', 'modifier')
  async testerSmtp(@Param('id') id: string, @Body() dto: TesterSmtpDto, @CurrentUser() user: AuthenticatedUser) {
    memeOrganisation(id, user);
    const rows: Array<{ email: string | null; nom: string }> = await this.dataSource.query(
      `select email, trim(coalesce(prenom, '') || ' ' || nom) as nom from utilisateurs where id = $1`,
      [user.id],
    );
    const moi = rows[0];
    if (!moi?.email) return { ok: false, message: "Votre compte n'a pas d'adresse e-mail." };
    return this.emails.envoyerTest(id, { email: moi.email, nom: moi.nom }, dto.urlApplication ?? null);
  }
}
