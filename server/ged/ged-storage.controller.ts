import { BadRequestException, Body, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GedStorageService } from './ged-storage.service';

const TAILLE_MAX_OCTETS = 25 * 1024 * 1024; // 25 Mo

class AjouterDocumentDto {
  @IsString() titre: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() categorieId?: string | null;
  @IsOptional() @IsUUID() confidentialiteValeurId?: string | null;
  @IsOptional() @IsInt() dureeConservationMois?: number | null;
}

class VerserVersionDto {
  @IsOptional() @IsString() commentaire?: string | null;
}

@Controller('ged')
export class GedStorageController {
  constructor(private readonly storageService: GedStorageService) {}

  @Post('versements/:id/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_OCTETS } }))
  creerDocument(
    @Param('id') versementId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: AjouterDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    return this.storageService.creerDocumentAvecFichier(versementId, dto, file, user);
  }

  @Post('documents/:id/versions')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_OCTETS } }))
  verserVersion(
    @Param('id') documentId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: VerserVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    return this.storageService.verserVersion(documentId, file, dto.commentaire ?? null, user);
  }

  @Get('versions/:id/telecharger')
  async telecharger(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const fichier = await this.storageService.telecharger(id, user);
    res.download(fichier.cheminAbsolu, fichier.nomFichier);
  }
}
