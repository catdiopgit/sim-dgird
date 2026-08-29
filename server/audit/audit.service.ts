import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalAudit } from '../common/entities/journal-audit.entity';

// Vue d'ensemble Administration > Audit (RLS journal_audit_select :
// has_permission('administration','consulter'), déjà appliqué au niveau
// contrôleur via PermissionsGuard) — lecture directe, la table est alimentée
// par le trigger SQL app.fn_audit_trigger (catégorie 1, reste en SQL).
@Injectable()
export class AuditService {
  constructor(@InjectRepository(JournalAudit) private readonly journalAudit: Repository<JournalAudit>) {}

  list(organisationId: string, filtres: { objetType?: string } = {}): Promise<JournalAudit[]> {
    return this.journalAudit.find({
      where: { organisationId, ...(filtres.objetType ? { objetType: filtres.objetType } : {}) },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}
