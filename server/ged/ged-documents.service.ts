import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { GedVersement } from './entities/ged-versement.entity';

export interface AjouterDocumentData {
  titre: string;
  description?: string | null;
  categorieId?: string | null;
  confidentialiteValeurId?: string | null;
  dureeConservationMois?: number | null;
}

export interface ModifierDocumentData {
  titre?: string;
  description?: string | null;
  confidentialiteValeurId?: string | null;
  dureeConservationMois?: number | null;
}

export interface ClasserDocumentData {
  titre?: string;
  dossierId?: string | null;
  motsCles?: string[];
}

// Portage de app.can_view_document (0057, dernier corps, aware confidentialité) et
// app.fn_ajouter_document_versement / fn_classer_document. app.fn_verser_version_document
// (écriture disque + ligne document_versions) vit dans GedStorageService, qui réutilise
// ce service pour les vérifications d'accès/écriture.
@Injectable()
export class GedDocumentsService {
  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(DocumentVersion) private readonly versions: Repository<DocumentVersion>,
    @InjectRepository(GedVersement) private readonly versements: Repository<GedVersement>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
  ) {}

  // --- Visibilité (portage de app.can_view_document, 0057) ---

  async canView(document: Document, user: AuthenticatedUser): Promise<boolean> {
    if (document.organisationId !== user.organisationId) return false;
    if (document.createdBy === user.id) return true;

    const confidentialiteCode = await this.resoudreCodeConfidentialite(document.confidentialiteValeurId);
    const estSecrete = confidentialiteCode === 'secrete';

    if (!estSecrete && (await this.authorizationService.hasPermission(user.id, 'ged', 'consulter', document.entiteId))) {
      return true;
    }
    // §6 (0066) : un document rattaché à un projet hérite de sa visibilité, en
    // plus des voies d'accès GED classiques. Gaté par !estSecrete comme la
    // permission ged/consulter ci-dessus — voir la note sur la régression
    // 0066/0077 dans MIGRATION.md (Phase 5) : le SQL de production a
    // silencieusement perdu la coupure `secrete` en ajoutant cette branche,
    // reproduite ici volontairement corrigée plutôt qu'à l'identique.
    if (!estSecrete && document.projetId && (await this.peutVoirProjet(document.projetId, user))) {
      return true;
    }
    // §Phase 6 : même branche que projetId juste au-dessus, portage de la partie
    // mission_id de app.can_view_document (0077) — gatée par !estSecrete pour la
    // même raison (voir la note sur la régression 0066/0077 quelques lignes plus haut).
    if (!estSecrete && document.missionId && (await this.peutVoirMission(document.missionId, user))) {
      return true;
    }
    if (await this.aDroitConsulter('document_droits', 'document_id', document.id, user)) return true;

    // Une fois qu'un document est marqué 'secrete', aucun repli via le dossier
    // parent — asymétrie volontaire (voir §5 du rapport de recherche Phase 4).
    if (estSecrete) return false;

    if (document.dossierId) {
      return this.aDroitConsulter('dossier_droits', 'dossier_id', document.dossierId, user);
    }
    return false;
  }

  async assertModifiable(document: Document, user: AuthenticatedUser): Promise<void> {
    const autorise =
      document.createdBy === user.id ||
      (await this.authorizationService.hasPermission(user.id, 'ged', 'modifier', document.entiteId));
    if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce document");
  }

  // Duplication volontaire (raw SQL) de app.can_view_projet (0071, dernier
  // corps) plutôt qu'une dépendance vers ProjetsModule : éviterait un import
  // circulaire (ProjetsModule dépend déjà de GedModule pour Document/GedStorageService).
  // Même patron que aDroitConsulter juste au-dessus.
  private async peutVoirProjet(projetId: string, user: AuthenticatedUser): Promise<boolean> {
    const rows: Array<{
      responsable_id: string | null;
      coordonnateur_id: string | null;
      entite_id: string;
      portee_visibilite: string;
    }> = await this.dataSource.query(
      `select responsable_id, coordonnateur_id, entite_id, portee_visibilite
       from projets where id = $1 and organisation_id = $2`,
      [projetId, user.organisationId],
    );
    const projet = rows[0];
    if (!projet) return false;
    if (projet.responsable_id === user.id || projet.coordonnateur_id === user.id) return true;
    if (await this.authorizationService.hasPermission(user.id, 'projets', 'consulter', projet.entite_id)) return true;

    const membre = await this.dataSource.query(
      'select 1 from projet_membres where projet_id = $1 and utilisateur_id = $2 and date_retrait is null limit 1',
      [projetId, user.id],
    );
    if (membre.length > 0) return true;

    switch (projet.portee_visibilite) {
      case 'tous':
        return true;
      case 'entites': {
        if (!user.entiteId) return false;
        const r = await this.dataSource.query(
          'select 1 from projet_visibilite_entites where projet_id = $1 and entite_id = $2 limit 1',
          [projetId, user.entiteId],
        );
        return r.length > 0;
      }
      case 'agents': {
        const r = await this.dataSource.query(
          'select 1 from projet_visibilite_utilisateurs where projet_id = $1 and utilisateur_id = $2 limit 1',
          [projetId, user.id],
        );
        return r.length > 0;
      }
      default:
        return false;
    }
  }

  // Duplication volontaire (raw SQL) de app.can_view_mission (0016) plutôt qu'une
  // dépendance vers MissionsModule — même raison que peutVoirProjet juste au-dessus
  // (éviterait un import circulaire, MissionsModule dépend déjà de GedModule).
  private async peutVoirMission(missionId: string, user: AuthenticatedUser): Promise<boolean> {
    const rows: Array<{ entite_id: string; responsable_id: string | null }> = await this.dataSource.query(
      `select entite_id, responsable_id from missions where id = $1 and organisation_id = $2`,
      [missionId, user.organisationId],
    );
    const mission = rows[0];
    if (!mission) return false;
    if (mission.entite_id === user.entiteId || mission.responsable_id === user.id) return true;
    if (await this.authorizationService.hasPermission(user.id, 'missions', 'consulter', mission.entite_id)) return true;

    const participant = await this.dataSource.query(
      'select 1 from mission_participants where mission_id = $1 and utilisateur_id = $2 limit 1',
      [missionId, user.id],
    );
    return participant.length > 0;
  }

  private async resoudreCodeConfidentialite(valeurId: string | null): Promise<string | null> {
    if (!valeurId) return null;
    const rows: Array<{ code: string }> = await this.dataSource.query('select code from valeurs_listes where id = $1', [
      valeurId,
    ]);
    return rows[0]?.code ?? null;
  }

  // Correspond direct (utilisateur_id), via l'entité courante, ou via n'importe
  // quel rôle actif détenu — non scopé par la portée de l'attribution du rôle,
  // contrairement à AuthorizationService.hasPermission (asymétrie assumée, voir
  // §5 du rapport de recherche).
  private async aDroitConsulter(
    table: 'document_droits' | 'dossier_droits',
    colonneParent: 'document_id' | 'dossier_id',
    parentId: string,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    const rows = await this.dataSource.query(
      `select 1 from ${table} d
       join actions a on a.id = d.action_id and a.code = 'consulter'
       where d.${colonneParent} = $1
         and (
           d.utilisateur_id = $2
           or ($3::uuid is not null and d.entite_id = $3::uuid)
           or (
             d.role_id is not null
             and exists (
               select 1 from utilisateur_roles ur
               where ur.utilisateur_id = $2 and ur.role_id = d.role_id
                 and (ur.date_fin is null or ur.date_fin >= current_date)
             )
           )
         )
       limit 1`,
      [parentId, user.id, user.entiteId],
    );
    return rows.length > 0;
  }

  // --- Lecture ---

  async findOne(id: string, user: AuthenticatedUser): Promise<Document> {
    const document = await this.documents.findOneBy({ id });
    if (!document || !(await this.canView(document, user))) {
      throw new NotFoundException('Document introuvable');
    }
    return document;
  }

  async findByVersement(versementId: string, user: AuthenticatedUser): Promise<Document[]> {
    const documents = await this.documents.find({
      where: { versementId, organisationId: user.organisationId },
      order: { createdAt: 'ASC' },
    });
    const resultats: Document[] = [];
    for (const document of documents) {
      if (document.supprimeLe) continue;
      if (await this.canView(document, user)) resultats.push(document);
    }
    return resultats;
  }

  async listVersions(documentId: string, user: AuthenticatedUser): Promise<DocumentVersion[]> {
    await this.findOne(documentId, user); // 404 si non visible
    return this.versions.find({ where: { documentId }, order: { versionMajeure: 'DESC' } });
  }

  // --- Écriture (portage de app.fn_ajouter_document_versement, app.fn_classer_document) ---

  async ajouterDocument(versementId: string, data: AjouterDocumentData, user: AuthenticatedUser): Promise<Document> {
    const versement = await this.versements.findOneBy({ id: versementId });
    if (!versement || versement.organisationId !== user.organisationId) {
      throw new NotFoundException('Versement introuvable');
    }
    if (!versement.brouillon) throw new ForbiddenException("Ce versement n'est plus modifiable (déjà soumis)");
    const autorise =
      versement.redacteurId === user.id ||
      (await this.authorizationService.hasPermission(user.id, 'ged', 'modifier', versement.entiteId));
    if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à ajouter un document à ce versement");

    return this.documents.save(
      this.documents.create({
        organisationId: versement.organisationId,
        versementId: versement.id,
        entiteId: versement.entiteId,
        titre: data.titre,
        description: data.description ?? null,
        categorieId: data.categorieId ?? null,
        confidentialiteValeurId: data.confidentialiteValeurId ?? null,
        dureeConservationMois: data.dureeConservationMois ?? null,
        createdBy: user.id,
      }),
    );
  }

  async modifierDocument(id: string, data: ModifierDocumentData, user: AuthenticatedUser): Promise<Document> {
    const document = await this.findOne(id, user);
    await this.assertModifiable(document, user);
    await this.documents.update(id, data as Parameters<typeof this.documents.update>[1]);
    return this.findOne(id, user);
  }

  async classerDocument(id: string, data: ClasserDocumentData, user: AuthenticatedUser): Promise<Document> {
    const document = await this.findOne(id, user);
    // Pas de dérogation créateur ici, contrairement aux autres écritures — fidèle
    // à fn_classer_document qui exige la permission 'modifier' dans tous les cas.
    if (!(await this.authorizationService.hasPermission(user.id, 'ged', 'modifier', document.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à classer ce document");
    }

    // COALESCE-style repli fidèle à la source : un dossierId explicite (non
    // null) gagne, sinon le dossier cible du versement, sinon inchangé — un
    // appelant ne peut pas "désclasser" un document via null (limite héritée
    // du SQL d'origine, pas une régression de ce port).
    let dossierId = data.dossierId ?? null;
    if (!dossierId && document.versementId) {
      const versement = await this.versements.findOneBy({ id: document.versementId });
      dossierId = versement?.dossierCibleId ?? null;
    }
    if (!dossierId) dossierId = document.dossierId;

    await this.documents.update(id, {
      titre: data.titre ?? document.titre,
      dossierId,
      motsCles: data.motsCles ?? document.motsCles,
    });
    return this.findOne(id, user);
  }
}
