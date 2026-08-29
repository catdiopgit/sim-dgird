import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { getStorageRoot } from '../config/storage.config';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { GedConsultationsService } from './ged-consultations.service';
import { GedDocumentsService, type AjouterDocumentData } from './ged-documents.service';

export interface FichierEntrant {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface FichierTelecharge {
  cheminAbsolu: string;
  nomFichier: string;
  typeMime: string | null;
}

// Portage de app.fn_verser_version_document (0056/0058) + logique de
// téléchargement (app.fn_telecharger_document trace l'accès, le fichier
// lui-même venait de Supabase Storage côté frontend — voir §3 du rapport de
// recherche Phase 4). Même schéma disque que CourrierStorageService
// (server/courrier/courrier-storage.service.ts), sous un préfixe distinct.
@Injectable()
export class GedStorageService {
  private readonly storageRoot = getStorageRoot();

  constructor(
    @InjectRepository(DocumentVersion) private readonly versions: Repository<DocumentVersion>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly documentsService: GedDocumentsService,
    private readonly consultationsService: GedConsultationsService,
  ) {}

  // Compose fn_ajouter_document_versement + fn_verser_version_document, avec
  // le même repli "supprimer le document orphelin si l'upload échoue" que le
  // frontend actuel (ajouterDocumentAvecFichier, services/ged/documents.ts).
  async creerDocumentAvecFichier(
    versementId: string,
    data: AjouterDocumentData,
    fichier: FichierEntrant,
    user: AuthenticatedUser,
  ): Promise<{ document: Document; version: DocumentVersion }> {
    const document = await this.documentsService.ajouterDocument(versementId, data, user);
    try {
      const version = await this.verserVersion(document.id, fichier, null, user);
      return { document: await this.documentsService.findOne(document.id, user), version };
    } catch (err) {
      await this.dataSource.manager.delete(Document, document.id);
      throw err;
    }
  }

  // Pas de verrou FOR UPDATE côté SQL d'origine sur le calcul de
  // version_majeure — reproduit fidèlement ; une course concurrente sur le même
  // document ferait échouer un des deux inserts sur la contrainte unique
  // (document_id, version_majeure, version_mineure) plutôt que d'être
  // silencieusement absorbée (voir rapport de recherche §2).
  async verserVersion(
    documentId: string,
    fichier: FichierEntrant,
    commentaire: string | null,
    user: AuthenticatedUser,
  ): Promise<DocumentVersion> {
    const document = await this.documentsService.findOne(documentId, user);
    await this.documentsService.assertModifiable(document, user);

    // MAX(int) revient en number côté driver pg (contrairement à un bigint,
    // toujours stringifié) — pas de conversion supplémentaire nécessaire ici.
    const maxRow: { max: number | null } | undefined = await this.versions
      .createQueryBuilder('v')
      .select('MAX(v.versionMajeure)', 'max')
      .where('v.documentId = :documentId', { documentId })
      .getRawOne();
    const versionMajeure = (maxRow?.max ?? 0) + 1;

    const storagePath = await this.ecrireFichier(documentId, fichier);
    let version: DocumentVersion;
    try {
      version = await this.versions.save(
        this.versions.create({
          documentId,
          versionMajeure,
          versionMineure: 0,
          storagePath,
          nomFichier: this.nomSanitise(fichier.originalname),
          tailleOctets: fichier.size,
          typeMime: fichier.mimetype || null,
          commentaire,
          createdBy: user.id,
        }),
      );
    } catch (err) {
      await this.supprimerFichierDisque(storagePath);
      throw err;
    }

    await this.dataSource.manager.update(Document, documentId, { versionCouranteId: version.id });
    return version;
  }

  // Paramétré par id de VERSION, pas de document : GED garde tout l'historique
  // des fichiers (contrairement à Courrier), il faut pouvoir télécharger une
  // version précédente, pas seulement la courante. Fait aussi office de
  // app.fn_telecharger_document (trace l'accès via GedConsultationsService,
  // qui revérifie la visibilité du document porteur).
  async telecharger(versionId: string, user: AuthenticatedUser): Promise<FichierTelecharge> {
    const version = await this.versions.findOneBy({ id: versionId });
    if (!version) throw new NotFoundException('Version introuvable');
    await this.consultationsService.tracer(version.documentId, 'telechargement', user);
    return {
      cheminAbsolu: this.resoudreCheminSecurise(version.storagePath),
      nomFichier: version.nomFichier,
      typeMime: version.typeMime,
    };
  }

  private async ecrireFichier(documentId: string, fichier: FichierEntrant): Promise<string> {
    const relatif = `${documentId}/${randomUUID()}-${this.nomSanitise(fichier.originalname)}`;
    const absolu = this.resoudreCheminSecurise(relatif);
    await fs.mkdir(path.dirname(absolu), { recursive: true });
    await fs.writeFile(absolu, fichier.buffer);
    return relatif;
  }

  private async supprimerFichierDisque(storagePath: string): Promise<void> {
    try {
      await fs.unlink(this.resoudreCheminSecurise(storagePath));
    } catch {
      // best-effort
    }
  }

  private resoudreCheminSecurise(storagePath: string): string {
    const absolu = path.resolve(this.storageRoot, 'ged', storagePath);
    const racineGed = path.resolve(this.storageRoot, 'ged');
    if (absolu !== racineGed && !absolu.startsWith(racineGed + path.sep)) {
      throw new BadRequestException('Chemin de stockage invalide');
    }
    return absolu;
  }

  private nomSanitise(nom: string): string {
    const base = path.basename(nom).replace(/[^\w.\- ]+/g, '_').trim();
    return base.slice(0, 200) || 'fichier';
  }
}
