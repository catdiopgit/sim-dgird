import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowEtape } from '../workflow/entities/workflow-etape.entity';
import { WorkflowInstance } from '../workflow/entities/workflow-instance.entity';
import { Document } from './entities/document.entity';
import { GedVersement } from './entities/ged-versement.entity';
import { versementVersContexte } from './ged-versement-contexte.util';
import { GedAccesService } from './ged-acces.service';
import { GedNotificationsService } from './ged-notifications.service';
import { getStorageRoot } from '../config/storage.config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface CreerVersementData {
  objet: string;
  entiteId?: string | null;
  dossierCibleId?: string | null;
  description?: string | null;
  dateDebutExtreme?: string | null;
  dateFinExtreme?: string | null;
}

export interface ModifierVersementData {
  objet?: string;
  description?: string | null;
  entiteId?: string | null;
  dossierCibleId?: string | null;
  dateDebutExtreme?: string | null;
  dateFinExtreme?: string | null;
}

export interface ClasserVersementData {
  codeArchivage: string;
  dossierParentId: string;
}

// v8.6.4 : dates extrêmes = date du plus ancien et du plus récent document
// versé ; aucune date future, et la fin ne précède pas le début.
function controlerDatesExtremes(debut: string | null | undefined, fin: string | null | undefined): void {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (debut && debut.slice(0, 10) > aujourdhui) throw new BadRequestException('La date de début extrême ne peut pas être dans le futur');
  if (fin && fin.slice(0, 10) > aujourdhui) throw new BadRequestException('La date de fin extrême ne peut pas être dans le futur');
  if (debut && fin && fin.slice(0, 10) < debut.slice(0, 10)) {
    throw new BadRequestException('La date de fin extrême ne peut pas précéder la date de début');
  }
}

// Portage de app.fn_creer_versement, app.fn_soumettre_versement,
// app.fn_bannette_ged. La partie workflow (transitions/exécution) vit dans
// GedWorkflowService, qui dépend de ce service pour canView/findOne.
@Injectable()
export class GedVersementsService {
  constructor(
    @InjectRepository(GedVersement) private readonly versements: Repository<GedVersement>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly acces: GedAccesService,
    private readonly gedNotifications: GedNotificationsService,
  ) {}

  // v8.6 : le déposant, l'archiviste, le responsable de l'entité (ou d'une
  // entité parente), et les rôles ayant « GED / consulter » sur une portée
  // étendue. La portée « personnel » ne couvre plus que ses propres versements.
  // v8.6.11 : le versement est rattaché à la DIRECTION du déposant. Le voient :
  // le déposant, l'archiviste, les responsables hiérarchiques du déposant
  // (chef de division…) et le directeur de la direction versante. Pas les
  // autres agents de la direction : une fois archivés, les documents suivent
  // les règles d'accès aux archives.
  async canView(versement: GedVersement, user: AuthenticatedUser): Promise<boolean> {
    if (versement.organisationId !== user.organisationId) return false;
    if (versement.redacteurId === user.id) return true;
    if (await this.acces.estArchiviste(user.id)) return true;
    if (await this.acces.estResponsableHierarchique(versement.entiteId, user.id)) return true;
    const entiteDeposant = await this.entiteDeposant(versement.redacteurId);
    return this.acces.estResponsableHierarchique(entiteDeposant, user.id);
  }

  private async entiteDeposant(redacteurId: string | null): Promise<string | null> {
    if (!redacteurId) return null;
    const rows: Array<{ entite_id: string | null }> = await this.dataSource.query(
      'select entite_id from utilisateurs where id = $1',
      [redacteurId],
    );
    return rows[0]?.entite_id ?? null;
  }

  // Brouillon : le déposant. Une fois soumis : l'archiviste seul.
  async peutModifier(versement: GedVersement, user: AuthenticatedUser): Promise<boolean> {
    if (await this.acces.estArchiviste(user.id)) return true;
    if (!versement.brouillon) return false;
    return versement.redacteurId === user.id;
  }

  // Direction versante : imposée (direction de l'agent), au choix pour l'archiviste.
  private async directionVersante(demandee: string | null | undefined, user: AuthenticatedUser): Promise<string | null> {
    if (await this.acces.estArchiviste(user.id)) {
      if (demandee) {
        if (!(await this.acces.estDirection(demandee, user.organisationId))) {
          throw new BadRequestException('Choisissez une direction comme entité versante');
        }
        return demandee;
      }
    }
    return this.acces.directionDe(user.entiteId);
  }

  async optionsVersement(user: AuthenticatedUser) {
    const archiviste = await this.acces.estArchiviste(user.id);
    const directionId = await this.acces.directionDe(user.entiteId);
    const directions = await this.acces.directions(user.organisationId);
    return { archiviste, directionParDefaut: directions.find((d) => d.id === directionId) ?? null, directions: archiviste ? directions : [] };
  }

  private async assertDossierCible(dossierCibleId: string | null | undefined, user: AuthenticatedUser): Promise<void> {
    if (!dossierCibleId) return;
    const rows: Array<{ actif: boolean; organisation_id: string }> = await this.dataSource.query(
      'select actif, organisation_id from ged_dossiers where id = $1 and supprime_le is null',
      [dossierCibleId],
    );
    if (!rows[0] || rows[0].organisation_id !== user.organisationId) throw new NotFoundException('Dossier introuvable');
    if (!rows[0].actif) throw new BadRequestException('Ce dossier du plan de classement est désactivé');
    if (!(await this.acces.peutProposerDossier(dossierCibleId, user))) {
      throw new ForbiddenException(
        "Cette série du plan de classement est réservée à d'autres entités : choisissez une série de votre entité",
      );
    }
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<GedVersement> {
    const versement = await this.versements.findOneBy({ id });
    if (!versement || versement.supprimeLe || !(await this.canView(versement, user))) {
      throw new NotFoundException('Versement introuvable');
    }
    return versement;
  }

  async findAll(user: AuthenticatedUser, brouillonsSeulement = false): Promise<GedVersement[]> {
    const versements = await this.versements.find({
      where: { organisationId: user.organisationId, ...(brouillonsSeulement ? { brouillon: true } : {}) },
      order: { updatedAt: 'DESC' },
    });
    // v8.8.0 (lot 3) : mêmes règles que canView, évaluées en une requête.
    const actifs = versements.filter((v) => !v.supprimeLe);
    if (actifs.length === 0) return [];
    if (await this.acces.estArchiviste(user.id)) return actifs;
    const lignes: Array<{ id: string }> = await this.dataSource.query(
      `select v.id from ged_versements v
       left join utilisateurs dep on dep.id = v.redacteur_id
       where v.id = any($1::uuid[]) and (
         v.redacteur_id = $2
         or exists (
           select 1 from entites mien join entites cible
             on mien.chemin OPERATOR(extensions.@>) cible.chemin
           where mien.responsable_utilisateur_id = $2
             and (cible.id = v.entite_id or cible.id = dep.entite_id)))`,
      [actifs.map((v) => v.id), user.id],
    );
    const visibles = new Set(lignes.map((l) => l.id));
    return actifs.filter((v) => visibles.has(v.id));
  }

  async create(data: CreerVersementData, user: AuthenticatedUser): Promise<GedVersement> {
    // v8.6.11 : tout agent ayant « GED / créer » verse pour sa direction ;
    // l'archiviste peut verser pour n'importe quelle direction.
    const autorise =
      (await this.acces.estArchiviste(user.id)) ||
      (await this.authorizationService.hasPermission(user.id, 'ged', 'creer', user.entiteId ?? null));
    if (!autorise) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à créer un versement");
    }
    const entiteId = await this.directionVersante(data.entiteId, user);
    await this.assertDossierCible(data.dossierCibleId, user);
    controlerDatesExtremes(data.dateDebutExtreme, data.dateFinExtreme);
    return this.versements.save(
      this.versements.create({
        organisationId: user.organisationId,
        entiteId,
        dossierCibleId: data.dossierCibleId ?? null,
        objet: data.objet,
        description: data.description ?? null,
        dateDebutExtreme: data.dateDebutExtreme ?? null,
        dateFinExtreme: data.dateFinExtreme ?? null,
        brouillon: true,
        redacteurId: user.id,
      }),
    );
  }

  async update(id: string, data: ModifierVersementData, user: AuthenticatedUser): Promise<GedVersement> {
    const versement = await this.findOne(id, user);
    if (!(await this.peutModifier(versement, user))) {
      throw new ForbiddenException(
        versement.brouillon
          ? "Vous n'êtes pas autorisé à modifier ce versement"
          : "Ce versement est en cours d'examen : seul l'archiviste peut le modifier",
      );
    }
    if (data.dossierCibleId !== undefined && data.dossierCibleId !== versement.dossierCibleId) {
      await this.assertDossierCible(data.dossierCibleId, user);
    }

    const debut = data.dateDebutExtreme !== undefined ? data.dateDebutExtreme : versement.dateDebutExtreme;
    const fin = data.dateFinExtreme !== undefined ? data.dateFinExtreme : versement.dateFinExtreme;
    controlerDatesExtremes(debut, fin);

    await this.versements.update(id, {
      dateDebutExtreme: debut ?? null,
      dateFinExtreme: fin ?? null,
      objet: data.objet ?? versement.objet,
      description: data.description !== undefined ? data.description : versement.description,
      entiteId:
        data.entiteId !== undefined && data.entiteId !== versement.entiteId && (await this.acces.estArchiviste(user.id))
          ? await this.directionVersante(data.entiteId, user)
          : versement.entiteId,
      dossierCibleId: data.dossierCibleId !== undefined ? data.dossierCibleId : versement.dossierCibleId,
    });
    return this.findOne(id, user);
  }

  // Portage de app.fn_soumettre_versement — verrou FOR UPDATE + démarrage de
  // workflow composé dans la même transaction (WorkflowEngineService.demarrerWorkflow
  // accepte le manager pour cette raison, voir MIGRATION.md Phase 3).
  async soumettre(id: string, user: AuthenticatedUser): Promise<GedVersement> {
    return this.dataSource.transaction(async (manager) => {
      const rows: Array<{
        id: string;
        organisation_id: string;
        entite_id: string | null;
        brouillon: boolean;
        redacteur_id: string | null;
      }> = await manager.query('select * from ged_versements where id = $1 for update', [id]);
      const versement = rows[0];
      if (!versement || versement.organisation_id !== user.organisationId) {
        throw new NotFoundException('Versement introuvable');
      }
      if (!versement.brouillon) throw new BadRequestException('Ce versement est déjà soumis');

      const autorise = versement.redacteur_id === user.id || (await this.acces.estArchiviste(user.id));
      if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à soumettre ce versement");

      const nbDocuments = await manager.count(Document, { where: { versementId: id, supprimeLe: IsNull() } });
      if (nbDocuments === 0) throw new BadRequestException('Ce versement ne contient aucun document');
      // v8.7.1 : les dates extrêmes sont facultatives.

      const workflowInstanceId = await this.workflowEngineService.demarrerWorkflow(
        'ged',
        user.organisationId,
        user.id,
        null,
        manager,
      );
      const instance = await manager.findOneByOrFail(WorkflowInstance, { id: workflowInstanceId });
      const etape = await manager.findOneByOrFail(WorkflowEtape, { id: instance.etapeCouranteId });

      await manager.update(GedVersement, id, {
        brouillon: false,
        soumisLe: new Date(),
        workflowInstanceId: instance.id,
        etapeCode: etape.code,
        etapeLibelle: etape.libelle,
      });
      return manager.findOneByOrFail(GedVersement, { id });
    }).then(async (versement) => {
      const archivistes = await this.acces.archivistes(versement.organisationId);
      await this.gedNotifications.notifier(archivistes, {
        titre: 'Nouveau versement à archiver',
        message: `« ${versement.objet} » a été soumis et attend votre réception.`,
        versementId: versement.id,
        auteurId: user.id,
      });
      return versement;
    });
  }

  // v8.6.4 — classement d'un versement par l'archiviste, à l'étape « En
  // classement » : il saisit le code d'archivage (unique) et choisit
  // l'emplacement dans le plan ; le SIM crée sous cet emplacement le dossier
  // du versement (code = code d'archivage, intitulé = objet) et y range tous
  // ses documents. Un reclassement avant l'archivage met à jour ce dossier.
  async classer(id: string, data: ClasserVersementData, user: AuthenticatedUser): Promise<GedVersement> {
    const versement = await this.findOne(id, user);
    if (!(await this.acces.estArchiviste(user.id))) {
      throw new ForbiddenException("Seul l'archiviste peut classer un versement");
    }
    if (versement.etapeCode !== 'classement') {
      throw new BadRequestException("Le classement se fait à l'étape « En classement » du versement");
    }
    const code = data.codeArchivage?.trim().replace(/\s+/g, ' ');
    if (!code) throw new BadRequestException("Le code d'archivage est obligatoire");
    if (code.length > 40) throw new BadRequestException("Code d'archivage trop long (40 caractères au maximum)");

    const parent: Array<{ id: string; actif: boolean; organisation_id: string; supprime_le: Date | null }> =
      await this.dataSource.query('select id, actif, organisation_id, supprime_le from ged_dossiers where id = $1', [
        data.dossierParentId,
      ]);
    if (!parent[0] || parent[0].organisation_id !== user.organisationId || parent[0].supprime_le) {
      throw new NotFoundException('Emplacement du plan de classement introuvable');
    }
    if (!parent[0].actif) throw new BadRequestException('Cet emplacement du plan de classement est désactivé');
    if (data.dossierParentId === versement.dossierVersementId) {
      throw new BadRequestException("Choisissez l'emplacement du plan, pas le dossier du versement lui-même");
    }

    const dejaVersement: Array<{ objet: string }> = await this.dataSource.query(
      `select objet from ged_versements
       where organisation_id = $1 and lower(code_archivage) = lower($2) and id <> $3 and supprime_le is null limit 1`,
      [user.organisationId, code, id],
    );
    if (dejaVersement[0]) {
      throw new ConflictException(`Le code d'archivage « ${code} » est déjà attribué (versement « ${dejaVersement[0].objet} »)`);
    }
    const dejaDossier: Array<{ libelle: string }> = await this.dataSource.query(
      `select libelle from ged_dossiers
       where organisation_id = $1 and lower(code) = lower($2) and ($3::uuid is null or id <> $3::uuid) limit 1`,
      [user.organisationId, code, versement.dossierVersementId],
    );
    if (dejaDossier[0]) {
      throw new ConflictException(`Le code « ${code} » est déjà utilisé dans le plan de classement (« ${dejaDossier[0].libelle} »)`);
    }

    await this.dataSource.transaction(async (m) => {
      let dossierId = versement.dossierVersementId;
      const existe = dossierId
        ? (await m.query('select 1 from ged_dossiers where id = $1 and supprime_le is null', [dossierId])).length > 0
        : false;
      if (existe) {
        await m.query(
          'update ged_dossiers set code = $2, libelle = $3, parent_dossier_id = $4, updated_at = now() where id = $1',
          [dossierId, code, versement.objet, data.dossierParentId],
        );
      } else {
        const ordre: Array<{ max: number | null }> = await m.query(
          'select max(ordre) as max from ged_dossiers where parent_dossier_id = $1 and supprime_le is null',
          [data.dossierParentId],
        );
        dossierId = (
          await m.query(
            `insert into ged_dossiers (organisation_id, parent_dossier_id, code, libelle, entite_id, ordre, description, created_by)
             values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
            [
              user.organisationId,
              data.dossierParentId,
              code,
              versement.objet,
              versement.entiteId,
              (ordre[0]?.max ?? 0) + 10,
              'Dossier du versement ' + code,
              user.id,
            ],
          )
        )[0].id;
      }
      await m.query('update documents set dossier_id = $2 where versement_id = $1 and supprime_le is null', [id, dossierId]);
      await m.query(
        `update ged_versements set code_archivage = $2, dossier_versement_id = $3, dossier_cible_id = $4,
                classe_le = now(), updated_at = now() where id = $1`,
        [id, code, dossierId, data.dossierParentId],
      );
    });
    return this.findOne(id, user);
  }

  // v8.6 : retirer un document d'un brouillon (fichiers compris).
  async retirerDocument(versementId: string, documentId: string, user: AuthenticatedUser): Promise<void> {
    const versement = await this.findOne(versementId, user);
    if (!versement.brouillon) throw new BadRequestException('Seul un brouillon peut être modifié');
    if (!(await this.peutModifier(versement, user))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce versement");
    }
    const document = await this.documents.findOneBy({ id: documentId, versementId });
    if (!document) throw new NotFoundException('Document introuvable dans ce versement');

    const chemins: Array<{ storage_path: string }> = await this.dataSource.transaction(async (m) => {
      const versions: Array<{ storage_path: string }> = await m.query(
        'select storage_path from document_versions where document_id = $1',
        [documentId],
      );
      await m.query('update documents set version_courante_id = null where id = $1', [documentId]);
      await m.query('delete from ged_consultations where document_id = $1', [documentId]);
      await m.query('delete from document_droits where document_id = $1', [documentId]);
      await m.query('delete from document_versions where document_id = $1', [documentId]);
      await m.query('delete from documents where id = $1', [documentId]);
      return versions;
    });
    const racine = path.resolve(getStorageRoot(), 'ged');
    for (const { storage_path } of chemins) {
      const absolu = path.resolve(racine, storage_path);
      if (absolu.startsWith(racine + path.sep)) await fs.unlink(absolu).catch(() => undefined);
    }
  }

  // v8.6 : annuler un brouillon (conservé en base, masqué partout).
  async annuler(id: string, user: AuthenticatedUser): Promise<void> {
    const versement = await this.findOne(id, user);
    if (!versement.brouillon) throw new BadRequestException('Seul un brouillon peut être annulé');
    if (!(await this.peutModifier(versement, user))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à annuler ce versement");
    }
    await this.dataSource.transaction(async (m) => {
      await m.query('update ged_versements set supprime_le = now() where id = $1', [id]);
      await m.query('update documents set supprime_le = now() where versement_id = $1 and supprime_le is null', [id]);
    });
  }

  // --- Bannette (portage de app.fn_bannette_ged) ---

  async findATraiter(user: AuthenticatedUser): Promise<GedVersement[]> {
    const candidats = await this.versements.find({
      where: { organisationId: user.organisationId, brouillon: false },
    });
    const resultats: GedVersement[] = [];
    for (const versement of candidats) {
      if (versement.supprimeLe || !versement.workflowInstanceId) continue;
      if (!(await this.canView(versement, user))) continue;

      const instance = await this.dataSource.manager.findOneBy(WorkflowInstance, { id: versement.workflowInstanceId });
      if (!instance || instance.statutInstance !== 'en_cours') continue;

      const transitions = await this.workflowEngineService.transitionsDisponibles(
        instance.workflowDefinitionId,
        instance.etapeCouranteId,
        user.id,
        versement.entiteId,
        versementVersContexte(versement),
      );
      if (transitions.length > 0) resultats.push(versement);
    }
    return resultats;
  }
}
