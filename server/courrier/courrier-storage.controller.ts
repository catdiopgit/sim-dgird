import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CourrierStorageService } from './courrier-storage.service';

const TAILLE_MAX_OCTETS = 25 * 1024 * 1024; // 25 Mo

class DeverrouillerDto {
  @IsString() motif: string;
}

class AjouterPieceJointeDto {
  @IsOptional() @IsString() estScan?: string;
}

@Controller('courrier')
export class CourrierStorageController {
  constructor(private readonly storageService: CourrierStorageService) {}

  @Get('courriers/:id/pieces-jointes')
  list(@Param('id') courrierId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.storageService.listByCourrier(courrierId, user);
  }

  @Post('courriers/:id/pieces-jointes')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_OCTETS } }))
  ajouter(
    @Param('id') courrierId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: AjouterPieceJointeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    return this.storageService.ajouterPieceJointe(courrierId, file, dto.estScan === 'true', user);
  }

  @Delete('pieces-jointes/:id')
  supprimer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.storageService.supprimerPieceJointe(id, user);
  }

  @Get('pieces-jointes/:id/telecharger')
  async telecharger(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const fichier = await this.storageService.telecharger(id, user);
    res.download(fichier.cheminAbsolu, fichier.nomFichier);
  }

  @Post('courriers/:id/decharge')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_OCTETS } }))
  ajouterDecharge(
    @Param('id') courrierId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    return this.storageService.ajouterDecharge(courrierId, file, user);
  }

  @Post('courriers/:id/deverrouiller')
  deverrouiller(@Param('id') courrierId: string, @Body() dto: DeverrouillerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.storageService.deverrouiller(courrierId, dto.motif, user);
  }
}
