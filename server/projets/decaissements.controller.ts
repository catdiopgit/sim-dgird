import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { DecaissementsService, type CreerDecaissementData, type UpdateDecaissementData } from './decaissements.service';

const TAILLE_MAX_OCTETS = 25 * 1024 * 1024; // 25 Mo — même limite que GedStorageController

// Reçu en multipart/form-data (upload de justificatif) : tous les champs
// arrivent en string, d'où @Type(() => Number) explicite (le ValidationPipe
// global n'active pas la conversion implicite class-transformer).
class CreerDecaissementDto implements Omit<CreerDecaissementData, 'projetId'> {
  @IsOptional() @IsUUID() avenantId?: string | null;
  @Type(() => Number) @IsNumber() pourcentage: number;
  @Type(() => Number) @IsNumber() montant: number;
  @IsOptional() @IsString() dateDecaissement?: string;
  @IsOptional() @IsString() observations?: string | null;
  @IsString() titreDocument: string;
}

class UpdateDecaissementDto implements UpdateDecaissementData {
  @IsOptional() @IsNumber() pourcentage?: number;
  @IsOptional() @IsNumber() montant?: number;
  @IsOptional() @IsString() dateDecaissement?: string;
  @IsOptional() @IsString() observations?: string | null;
}

@Controller('projets/:projetId/decaissements')
export class DecaissementsController {
  constructor(private readonly decaissementsService: DecaissementsService) {}

  @Get()
  findAll(@Param('projetId') projetId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.decaissementsService.findAll(projetId, user);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TAILLE_MAX_OCTETS } }))
  create(
    @Param('projetId') projetId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreerDecaissementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Justificatif requis');
    const { titreDocument, ...data } = dto;
    return this.decaissementsService.creerAvecJustificatif({ projetId, ...data }, titreDocument, file, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDecaissementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.decaissementsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.decaissementsService.remove(id, user);
  }
}
