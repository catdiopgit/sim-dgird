import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GedConsultation, type TypeAccesGed } from './entities/ged-consultation.entity';
import { GedDocumentsService } from './ged-documents.service';

// Portage de app.fn_consulter_document / app.fn_telecharger_document — journal
// d'accès en lecture seule (voir GedConsultation), déclenché ici et par
// GedStorageService.telecharger (côté téléchargement).
@Injectable()
export class GedConsultationsService {
  constructor(
    @InjectRepository(GedConsultation) private readonly consultations: Repository<GedConsultation>,
    private readonly documentsService: GedDocumentsService,
  ) {}

  async tracer(documentId: string, typeAcces: TypeAccesGed, user: AuthenticatedUser): Promise<void> {
    await this.documentsService.findOne(documentId, user); // 404 si non visible
    await this.consultations.save(this.consultations.create({ documentId, utilisateurId: user.id, typeAcces }));
  }

  async tracerConsultation(documentId: string, user: AuthenticatedUser): Promise<void> {
    await this.tracer(documentId, 'consultation', user);
  }
}
