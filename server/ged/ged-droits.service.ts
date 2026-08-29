import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { Document } from './entities/document.entity';
import { DocumentDroit } from './entities/document-droit.entity';
import { GedDossier } from './entities/ged-dossier.entity';
import { DossierDroit } from './entities/dossier-droit.entity';

export interface OctroyerDroitData {
  actionCode: string;
  roleId?: string | null;
  utilisateurId?: string | null;
  entiteId?: string | null;
}

// Portage de app.fn_octroyer_droit_document / fn_revoquer_droit_document et leurs
// jumeaux _dossier (structure identique, voir §2 du rapport de recherche Phase 4).
@Injectable()
export class GedDroitsService {
  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(DocumentDroit) private readonly documentDroits: Repository<DocumentDroit>,
    @InjectRepository(GedDossier) private readonly dossiers: Repository<GedDossier>,
    @InjectRepository(DossierDroit) private readonly dossierDroits: Repository<DossierDroit>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
  ) {}

  // --- Document ---

  listPourDocument(documentId: string): Promise<DocumentDroit[]> {
    return this.documentDroits.find({ where: { documentId }, order: { createdAt: 'DESC' } });
  }

  async octroyerPourDocument(documentId: string, data: OctroyerDroitData, user: AuthenticatedUser): Promise<DocumentDroit> {
    const document = await this.documents.findOneBy({ id: documentId });
    if (!document) throw new NotFoundException('Document introuvable');
    if (!(await this.authorizationService.hasPermission(user.id, 'ged', 'modifier', document.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à gérer les droits de ce document");
    }
    this.validerCible(data);
    const actionId = await this.resoudreActionId(data.actionCode);
    return this.documentDroits.save(
      this.documentDroits.create({
        documentId,
        actionId,
        roleId: data.roleId ?? null,
        utilisateurId: data.utilisateurId ?? null,
        entiteId: data.entiteId ?? null,
      }),
    );
  }

  async revoquerPourDocument(droitId: string, user: AuthenticatedUser): Promise<void> {
    const rows: Array<{ document_id: string; entite_id: string | null }> = await this.dataSource.query(
      'select d.document_id, doc.entite_id from document_droits d join documents doc on doc.id = d.document_id where d.id = $1',
      [droitId],
    );
    const droit = rows[0];
    if (!droit) throw new NotFoundException('Droit introuvable');
    if (!(await this.authorizationService.hasPermission(user.id, 'ged', 'modifier', droit.entite_id))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à gérer les droits de ce document");
    }
    await this.documentDroits.delete(droitId);
  }

  // --- Dossier ---

  listPourDossier(dossierId: string): Promise<DossierDroit[]> {
    return this.dossierDroits.find({ where: { dossierId }, order: { createdAt: 'DESC' } });
  }

  async octroyerPourDossier(dossierId: string, data: OctroyerDroitData, user: AuthenticatedUser): Promise<DossierDroit> {
    const dossier = await this.dossiers.findOneBy({ id: dossierId });
    if (!dossier) throw new NotFoundException('Dossier introuvable');
    if (!(await this.authorizationService.hasPermission(user.id, 'ged', 'modifier', dossier.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à gérer les droits de ce dossier");
    }
    this.validerCible(data);
    const actionId = await this.resoudreActionId(data.actionCode);
    return this.dossierDroits.save(
      this.dossierDroits.create({
        dossierId,
        actionId,
        roleId: data.roleId ?? null,
        utilisateurId: data.utilisateurId ?? null,
        entiteId: data.entiteId ?? null,
      }),
    );
  }

  async revoquerPourDossier(droitId: string, user: AuthenticatedUser): Promise<void> {
    const rows: Array<{ dossier_id: string; entite_id: string | null }> = await this.dataSource.query(
      'select d.dossier_id, dos.entite_id from dossier_droits d join ged_dossiers dos on dos.id = d.dossier_id where d.id = $1',
      [droitId],
    );
    const droit = rows[0];
    if (!droit) throw new NotFoundException('Droit introuvable');
    if (!(await this.authorizationService.hasPermission(user.id, 'ged', 'modifier', droit.entite_id))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à gérer les droits de ce dossier");
    }
    await this.dossierDroits.delete(droitId);
  }

  // --- Commun ---

  private async resoudreActionId(code: string): Promise<string> {
    const rows: Array<{ id: string }> = await this.dataSource.query('select id from actions where code = $1', [code]);
    if (!rows[0]) throw new NotFoundException(`Action '${code}' introuvable`);
    return rows[0].id;
  }

  // Le SQL d'origine ne valide rien lui-même ici (contrainte CHECK laissée
  // échouer telle quelle) — validation ajoutée pour un message d'erreur plus
  // clair, amélioration mineure assumée (voir rapport de recherche §2).
  private validerCible(data: OctroyerDroitData): void {
    const cibles = [data.roleId, data.utilisateurId, data.entiteId].filter((v) => v != null);
    if (cibles.length !== 1) {
      throw new BadRequestException('Le droit doit référencer exactement une cible (rôle, utilisateur ou entité)');
    }
  }
}
