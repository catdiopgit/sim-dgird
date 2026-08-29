import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionsDocumentsService, type RoleDocumentMission } from './missions-documents.service';

const TAILLE_MAX_OCTETS = 25 * 1024 * 1024; // 25 Mo — même limite que GedStorageController/ProjetsDocumentsController
const ROLES: RoleDocumentMission[] = ['ordre_mission', 'compte_rendu', 'pv', 'depense'];

class AjouterDocumentMissionDto {
  @IsString() titre: string;
  @IsIn(ROLES) role: RoleDocumentMission;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() depenseId?: string | null;
}

@Controller('missions')
export class MissionsDocumentsController {
  constructor(private readonly documentsService: MissionsDocumentsService) {}

  @Get(':missionId/documents')
  listByMission(@Param('missionId') missionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.listByMission(missionId, user);
  }

  @Post(':missionId/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_OCTETS } }))
  ajouter(
    @Param('missionId') missionId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: AjouterDocumentMissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    return this.documentsService.ajouterDocumentAvecFichier({ missionId, ...dto }, file, user);
  }
}
