import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MarchesDocumentsService } from './marches-documents.service';

const TAILLE_MAX_OCTETS = 25 * 1024 * 1024; // même limite que GedStorageController

class AjouterDocumentMarcheDto {
  @IsString() titre: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() typeMarcheValeurId?: string | null;
  @IsOptional() @IsUUID() phaseMarcheId?: string | null;
  @IsOptional() @IsUUID() marcheCandidatId?: string | null;
}

@Controller('marches')
export class MarchesDocumentsController {
  constructor(private readonly documentsService: MarchesDocumentsService) {}

  @Get(':marcheId/documents')
  listByMarche(@Param('marcheId') marcheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.listByMarche(marcheId, user);
  }

  @Get('phases/:phaseMarcheId/documents')
  listByPhase(@Param('phaseMarcheId') phaseMarcheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.listByPhase(phaseMarcheId, user);
  }

  @Get('candidats/:marcheCandidatId/documents')
  listByCandidat(@Param('marcheCandidatId') marcheCandidatId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.listByCandidat(marcheCandidatId, user);
  }

  @Post(':marcheId/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_OCTETS } }))
  ajouter(
    @Param('marcheId') marcheId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: AjouterDocumentMarcheDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    return this.documentsService.ajouterDocumentAvecFichier({ marcheId, ...dto }, file, user);
  }
}
