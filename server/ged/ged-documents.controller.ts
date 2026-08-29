import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GedDocumentsService, type ClasserDocumentData, type ModifierDocumentData } from './ged-documents.service';
import { GedConsultationsService } from './ged-consultations.service';

class ModifierDocumentDto implements ModifierDocumentData {
  @IsOptional() @IsString() titre?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() confidentialiteValeurId?: string | null;
  @IsOptional() @IsInt() dureeConservationMois?: number | null;
}

class ClasserDocumentDto implements ClasserDocumentData {
  @IsOptional() @IsString() titre?: string;
  @IsOptional() @IsUUID() dossierId?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) motsCles?: string[];
}

@Controller('ged')
export class GedDocumentsController {
  constructor(
    private readonly documentsService: GedDocumentsService,
    private readonly consultationsService: GedConsultationsService,
  ) {}

  @Get('versements/:id/documents')
  listByVersement(@Param('id') versementId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findByVersement(versementId, user);
  }

  @Get('documents/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findOne(id, user);
  }

  @Get('documents/:id/versions')
  listVersions(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.listVersions(id, user);
  }

  @Patch('documents/:id')
  update(@Param('id') id: string, @Body() dto: ModifierDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.modifierDocument(id, dto, user);
  }

  @Post('documents/:id/classer')
  classer(@Param('id') id: string, @Body() dto: ClasserDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.classerDocument(id, dto, user);
  }

  @Post('documents/:id/tracer-consultation')
  async tracerConsultation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.consultationsService.tracerConsultation(id, user);
  }
}
