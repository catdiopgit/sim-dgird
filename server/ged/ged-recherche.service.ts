import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Document } from './entities/document.entity';
import { GedVersement } from './entities/ged-versement.entity';
import { GedDocumentsService } from './ged-documents.service';

export interface RechercheDocumentsParams {
  texte?: string;
  dossierId?: string | null;
  confidentialiteValeurId?: string | null;
  seulementNonClasses?: boolean;
  limite?: number;
  decalage?: number;
}

// Portage de app.fn_rechercher_documents (0063) — l'explorateur "Archives" GED
// (documents dont le versement porteur a atteint l'étape codée 'archivage'),
// distinct du sous-système d'archivage annuel Courrier/Projets/Missions
// (archivage_operations/archivage_elements, 0082, différé — voir MIGRATION.md).
@Injectable()
export class GedRechercheService {
  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    private readonly documentsService: GedDocumentsService,
  ) {}

  async rechercher(params: RechercheDocumentsParams, user: AuthenticatedUser): Promise<Document[]> {
    const qb = this.documents
      .createQueryBuilder('d')
      .innerJoin(GedVersement, 'v', 'v.id = d.versementId')
      .where('d.organisationId = :organisationId', { organisationId: user.organisationId })
      .andWhere('d.supprimeLe is null')
      .andWhere("v.etapeCode = 'archivage'")
      .orderBy('d.dateVersement', 'DESC');

    if (params.seulementNonClasses) {
      qb.andWhere('d.dossierId is null');
    } else if (params.dossierId) {
      qb.andWhere('d.dossierId = :dossierId', { dossierId: params.dossierId });
    }
    if (params.confidentialiteValeurId) {
      qb.andWhere('d.confidentialiteValeurId = :confidentialiteValeurId', {
        confidentialiteValeurId: params.confidentialiteValeurId,
      });
    }
    if (params.texte) {
      qb.andWhere(
        '(d.titre ILIKE :texte OR d.description ILIKE :texte OR EXISTS (SELECT 1 FROM unnest(d.motsCles) mc WHERE mc ILIKE :texte))',
        { texte: `%${params.texte}%` },
      );
    }

    // Filtrage de visibilité en mémoire après chargement (comme
    // CourriersService.findAll) — pagination appliquée après ce filtre, pas en
    // SQL, pour ne pas sous-compter les résultats visibles.
    const candidats = await qb.getMany();
    const visibles: Document[] = [];
    for (const document of candidats) {
      if (await this.documentsService.canView(document, user)) visibles.push(document);
    }

    const decalage = Math.max(params.decalage ?? 0, 0);
    const limite = Math.max(params.limite ?? 200, 0);
    return visibles.slice(decalage, decalage + limite);
  }

  // Portage de app.fn_compter_documents_par_dossier (0063) — badges de
  // comptage de l'explorateur Archives, même périmètre que rechercher()
  // (documents archivés visibles) mais sans pagination, groupé par dossier.
  async compterParDossier(user: AuthenticatedUser): Promise<Array<{ dossier_id: string | null; nb: number }>> {
    const candidats = await this.documents
      .createQueryBuilder('d')
      .innerJoin(GedVersement, 'v', 'v.id = d.versementId')
      .where('d.organisationId = :organisationId', { organisationId: user.organisationId })
      .andWhere('d.supprimeLe is null')
      .andWhere("v.etapeCode = 'archivage'")
      .getMany();

    const compteurs = new Map<string | null, number>();
    for (const document of candidats) {
      if (!(await this.documentsService.canView(document, user))) continue;
      compteurs.set(document.dossierId, (compteurs.get(document.dossierId) ?? 0) + 1);
    }
    return Array.from(compteurs.entries()).map(([dossier_id, nb]) => ({ dossier_id, nb }));
  }
}
