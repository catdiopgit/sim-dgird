import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { MarchesAccesService } from '../marches/acces/marches-acces.service';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { GedVersement } from './entities/ged-versement.entity';
import { GedAccesService } from './ged-acces.service';
import { GedVersementsService } from './ged-versements.service';

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
    private readonly marchesAcces: MarchesAccesService,
    private readonly acces: GedAccesService,
    private readonly versementsService: GedVersementsService,
  ) {}

  // v8.6 : un document est archivé quand son versement a atteint l'étape
  // finale « archivage » (date_archivage posée à ce moment-là).
  async estArchive(document: Document): Promise<boolean> {
    if (document.dateArchivage) return true;
    if (!document.versementId) return false;
    const v = await this.versements.findOneBy({ id: document.versementId });
    return v?.etapeCode === 'archivage';
  }

  // --- Visibilité (portage de app.can_view_document, 0057) ---

  // v8.6 — règles de consultation :
  //  - l'archiviste, l'auteur et les personnes autorisées une à une (droits
  //    du document) voient toujours ;
  //  - document ARCHIVÉ : publique/interne (ou sans niveau) → toute
  //    l'organisation ; confidentielle → l'entité du document (et ses
  //    responsables) + droits du dossier ; secrète → personne d'autre ;
  //  - document NON archivé : mêmes personnes que le versement (déposant,
  //    responsable, « GED / consulter » étendu), ou le projet / la mission /
  //    le marché porteur ; jamais au-delà pour un document secret.
  async canView(document: Document, user: AuthenticatedUser): Promise<boolean> {
    if (document.organisationId !== user.organisationId) return false;
    if (document.createdBy === user.id) return true;
    if (await this.acces.estArchiviste(user.id)) return true;
    if (await this.aDroitConsulter('document_droits', 'document_id', document.id, user)) return true;

    const confidentialiteCode = await this.resoudreCodeConfidentialite(document.confidentialiteValeurId);
    if (confidentialiteCode === 'secrete') return false;
    const estConfidentielle = confidentialiteCode === 'confidentielle';

    if (await this.estArchive(document)) {
      if (!estConfidentielle) return true;
      if (await this.acces.appartientA(document.entiteId, user)) return true;
      if (await this.acces.estResponsableHierarchique(document.entiteId, user.id)) return true;
      return document.dossierId ? this.aDroitConsulter('dossier_droits', 'dossier_id', document.dossierId, user) : false;
    }

    if (document.versementId) {
      const versement = await this.versements.findOneBy({ id: document.versementId });
      if (versement && !versement.supprimeLe && (await this.versementsService.canView(versement, user))) return true;
    }
    if (document.projetId && (await this.peutVoirProjet(document.projetId, user))) return true;
    if (document.missionId && (await this.peutVoirMission(document.missionId, user))) return true;
    if (document.marcheId) {
      const marches: Array<{ organisation_id: string; responsable_id: string | null; entite_id: string }> =
        await this.dataSource.query('select organisation_id, responsable_id, entite_id from marches where id = $1', [document.marcheId]);
      const m = marches[0];
      if (m && (await this.marchesAcces.peutVoir({ organisationId: m.organisation_id, responsableId: m.responsable_id, entiteId: m.entite_id }, user))) {
        return true;
      }
    }
    if (await this.authorizationService.hasPermissionEtendue(user.id, 'ged', 'consulter', document.entiteId)) return true;
    return document.dossierId ? this.aDroitConsulter('dossier_droits', 'dossier_id', document.dossierId, user) : false;
  }

  // v8.6 : un document archivé n'est modifiable que par l'archiviste ; un
  // document de versement en cours d'examen aussi. En brouillon : son auteur,
  // le déposant ou « GED / modifier » étendu. Documents de projet / marché
  // (sans versement) : règle d'origine (auteur ou « GED / modifier »).
  async assertModifiable(document: Document, user: AuthenticatedUser): Promise<void> {
    if (await this.acces.estArchiviste(user.id)) return;
    if (await this.estArchive(document)) {
      throw new ForbiddenException("Ce document est archivé : seul l'archiviste peut le modifier");
    }
    if (document.versementId) {
      const versement = await this.versements.findOneBy({ id: document.versementId });
      if (versement && !versement.brouillon) {
        throw new ForbiddenException("Ce document est en cours d'examen : seul l'archiviste peut le modifier");
      }
      if (versement && (document.createdBy === user.id || versement.redacteurId === user.id)) return;
      if (await this.authorizationService.hasPermissionEtendue(user.id, 'ged', 'modifier', document.entiteId)) return;
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce document");
    }
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
    if (await this.marchesAcces.estResponsableHierarchique(projet.entite_id, user.id)) return true;
    if (await this.authorizationService.hasPermissionEtendue(user.id, 'projets', 'consulter', projet.entite_id)) return true;

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
    if (!document || document.supprimeLe || !(await this.canView(document, user))) {
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
    if (versement.supprimeLe) throw new NotFoundException('Versement introuvable');
    if (!(await this.versementsService.peutModifier(versement, user))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à ajouter un document à ce versement");
    }

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

  // v8.6 : classement réservé à l'archiviste, à l'étape « classement » du
  // versement (ou pour reclasser un document déjà archivé), dans un dossier
  // actif du plan de classement.
  async classerDocument(id: string, data: ClasserDocumentData, user: AuthenticatedUser): Promise<Document> {
    const document = await this.findOne(id, user);
    if (!(await this.acces.estArchiviste(user.id))) {
      throw new ForbiddenException("Seul l'archiviste peut classer un document");
    }
    if (document.versementId && !(await this.estArchive(document))) {
      const versement = await this.versements.findOneBy({ id: document.versementId });
      if (versement?.etapeCode !== 'classement') {
        throw new BadRequestException("Le classement se fait à l'étape « En classement » du versement");
      }
    }

    let dossierId = data.dossierId ?? null;
    if (!dossierId && document.versementId) {
      const versement = await this.versements.findOneBy({ id: document.versementId });
      dossierId = versement?.dossierCibleId ?? null;
    }
    if (!dossierId) dossierId = document.dossierId;
    if (dossierId && dossierId !== document.dossierId) {
      const rows: Array<{ actif: boolean; organisation_id: string; supprime_le: Date | null }> = await this.dataSource.query(
        'select actif, organisation_id, supprime_le from ged_dossiers where id = $1',
        [dossierId],
      );
      if (!rows[0] || rows[0].organisation_id !== user.organisationId || rows[0].supprime_le) {
        throw new NotFoundException('Dossier introuvable');
      }
      if (!rows[0].actif) throw new BadRequestException('Ce dossier du plan de classement est désactivé');
    }

    await this.documents.update(id, {
      titre: data.titre ?? document.titre,
      dossierId,
      motsCles: data.motsCles ?? document.motsCles,
    });
    return this.findOne(id, user);
  }

  // v8.6 — contrôle des doublons : autres documents (non supprimés) dont la
  // version courante a la même empreinte SHA-256. Le titre n'est donné que
  // si l'utilisateur peut voir le document.
  async doublons(
    hash: string,
    user: AuthenticatedUser,
    exclureDocumentId: string | null = null,
  ): Promise<Array<{ documentId: string; titre: string | null; versementId: string | null; versementObjet: string | null; archive: boolean }>> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `select distinct d.id
       from document_versions v
       join documents d on d.id = v.document_id and d.version_courante_id = v.id
       left join ged_versements gv on gv.id = d.versement_id
       where v.hash_sha256 = $1 and d.organisation_id = $2 and d.supprime_le is null
         and (gv.id is null or gv.supprime_le is null)
         and ($3::uuid is null or d.id <> $3::uuid)`,
      [hash, user.organisationId, exclureDocumentId],
    );
    const resultats = [];
    for (const { id } of rows) {
      const d = await this.documents.findOneBy({ id });
      if (!d) continue;
      const visible = await this.canView(d, user);
      const v = d.versementId ? await this.versements.findOneBy({ id: d.versementId }) : null;
      resultats.push({
        documentId: d.id,
        titre: visible ? d.titre : null,
        versementId: visible ? d.versementId : null,
        versementObjet: visible ? (v?.objet ?? null) : null,
        archive: await this.estArchive(d),
      });
    }
    return resultats;
  }

  // Doublons de chaque document d'un versement (vue de l'archiviste au contrôle).
  async doublonsVersement(versementId: string, user: AuthenticatedUser) {
    const documents = await this.findByVersement(versementId, user);
    const resultat: Record<string, Awaited<ReturnType<GedDocumentsService['doublons']>>> = {};
    for (const d of documents) {
      if (!d.versionCouranteId) continue;
      const version = await this.versions.findOneBy({ id: d.versionCouranteId });
      if (!version?.hashSha256) continue;
      const autres = await this.doublons(version.hashSha256, user, d.id);
      if (autres.length > 0) resultat[d.id] = autres;
    }
    return resultat;
  }
}
