import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ProjetsDocumentsService } from './projets-documents.service';

const TAILLE_MAX_OCTETS = 25 * 1024 * 1024; // 25 Mo — même limite que GedStorageController

class AjouterDocumentProjetDto {
  @IsString() titre: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() typeProjetValeurId?: string | null;
  @IsOptional() @IsUUID() livrableId?: string | null;
  @IsOptional() @IsUUID() avenantId?: string | null;
}

@Controller('projets')
export class ProjetsDocumentsController {
  constructor(private readonly documentsService: ProjetsDocumentsService) {}

  @Get(':projetId/documents')
  listByProjet(@Param('projetId') projetId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.listByProjet(projetId, user);
  }

  @Get('livrables/:livrableId/documents')
  listByLivrable(@Param('livrableId') livrableId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.listByLivrable(livrableId, user);
  }

  @Post(':projetId/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_OCTETS } }))
  ajouter(
    @Param('projetId') projetId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: AjouterDocumentProjetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    return this.documentsService.ajouterDocumentAvecFichier({ projetId, ...dto }, file, user);
  }
}
