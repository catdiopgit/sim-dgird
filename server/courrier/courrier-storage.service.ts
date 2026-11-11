import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { getStorageRoot } from '../config/storage.config';
import { WorkflowHistorique } from '../workflow/entities/workflow-historique.entity';
import { Courrier } from './entities/courrier.entity';
import { CourrierPieceJointe } from './entities/courrier-piece-jointe.entity';
import { CourriersService } from './courriers.service';

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

// Portage de app.fn_ajouter_decharge_courrier (0054) et app.fn_deverrouiller_courrier
// (0047), différés à la fin de la Phase 3 (voir MIGRATION.md) le temps de bâtir le
// stockage local (décision d) qui remplace l'upload direct vers Supabase Storage —
// même convention de chemin ({courrier_id}/{uuid}-{nom_fichier}), mais relative à
// STORAGE_ROOT (server/config/storage.config.ts) plutôt qu'une clé d'objet bucket.
@Injectable()
export class CourrierStorageService {
  private readonly storageRoot = getStorageRoot();

  constructor(
    @InjectRepository(CourrierPieceJointe) private readonly piecesJointes: Repository<CourrierPieceJointe>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
    private readonly courriersService: CourriersService,
  ) {}

  async listByCourrier(courrierId: string, user: AuthenticatedUser): Promise<CourrierPieceJointe[]> {
    await this.courriersService.findOne(courrierId, user); // 404 si non visible
    return this.piecesJointes.find({ where: { courrierId }, order: { createdAt: 'DESC' } });
  }

  async ajouterPieceJointe(
    courrierId: string,
    fichier: FichierEntrant,
    estScan: boolean,
    user: AuthenticatedUser,
  ): Promise<CourrierPieceJointe> {
    const courrier = await this.courriersService.findOne(courrierId, user);
    await this.courriersService.assertWritable(courrier, user);

    const storagePath = await this.ecrireFichier(courrierId, fichier);
    try {
      return await this.piecesJointes.save(
        this.piecesJointes.create({
          courrierId,
          storagePath,
          nomFichier: this.nomSanitise(fichier.originalname),
          tailleOctets: fichier.size,
          typeMime: fichier.mimetype || null,
          estScan,
          createdBy: user.id,
        }),
      );
    } catch (err) {
      // Nettoyage de l'orphelin disque si l'insert échoue — même logique que le
      // frontend actuel (upload storage puis rollback si l'insert DB échoue).
      await this.supprimerFichierDisque(storagePath);
      throw err;
    }
  }

  async supprimerPieceJointe(id: string, user: AuthenticatedUser): Promise<void> {
    const piece = await this.piecesJointes.findOneBy({ id });
    if (!piece) throw new NotFoundException('Pièce jointe introuvable');
    const courrier = await this.courriersService.findOne(piece.courrierId, user);
    await this.courriersService.assertWritable(courrier, user);
    await this.piecesJointes.delete(id);
    if (piece.storagePath) await this.supprimerFichierDisque(piece.storagePath);
  }

  // Remplace le pattern createSignedUrl (TTL 60s) : pas d'équivalent en disque
  // local, on revérifie donc la visibilité du courrier à chaque téléchargement
  // plutôt que de s'appuyer sur un jeton temporaire.
  async telecharger(id: string, user: AuthenticatedUser): Promise<FichierTelecharge> {
    const piece = await this.piecesJointes.findOneBy({ id });
    if (!piece || !piece.storagePath) throw new NotFoundException('Pièce jointe introuvable');
    await this.courriersService.findOne(piece.courrierId, user); // 404 si non visible
    return {
      cheminAbsolu: this.resoudreCheminSecurise(piece.storagePath),
      nomFichier: piece.nomFichier,
      typeMime: piece.typeMime,
    };
  }

  // --- Décharge (portage de app.fn_ajouter_decharge_courrier, 0054) ---

  async ajouterDecharge(courrierId: string, fichier: FichierEntrant, user: AuthenticatedUser): Promise<Courrier> {
    return this.dataSource.transaction(async (manager) => {
      const courrier = await manager.findOneBy(Courrier, { id: courrierId });
      if (!courrier || courrier.organisationId !== user.organisationId) {
        throw new NotFoundException('Courrier introuvable');
      }
      if (courrier.sens !== 'sortant') {
        throw new BadRequestException('La décharge ne concerne que les courriers de départ');
      }
      if (courrier.verrouilleLe) throw new ConflictException('Courrier déjà verrouillé');

      const autorise =
        courrier.createdBy === user.id ||
        (await this.authorizationService.hasPermission(user.id, 'courrier', 'modifier', courrier.entiteId));
      if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à ajouter une décharge à ce courrier");

      // Circuit départ : la décharge suppose le courrier expédié.
      if (courrier.workflowInstanceId) {
        const etapes: Array<{ a_expedie: boolean; code: string | null }> = await manager.query(
          `select exists (select 1 from workflow_etapes e where e.workflow_definition_id = wi.workflow_definition_id and e.code = 'expedie') as a_expedie,
                  ec.code
           from workflow_instances wi join workflow_etapes ec on ec.id = wi.etape_courante_id
           where wi.id = $1`,
          [courrier.workflowInstanceId],
        );
        if (etapes[0]?.a_expedie && etapes[0].code !== 'expedie') {
          throw new BadRequestException("Le courrier doit d'abord être expédié avant d'y joindre la décharge");
        }
      }

      const storagePath = await this.ecrireFichier(courrierId, fichier);
      await manager.save(
        CourrierPieceJointe,
        manager.create(CourrierPieceJointe, {
          courrierId,
          storagePath,
          nomFichier: this.nomSanitise(fichier.originalname),
          tailleOctets: fichier.size,
          typeMime: fichier.mimetype || null,
          estDecharge: true,
          createdBy: user.id,
        }),
      );

      await manager.update(Courrier, courrierId, { verrouilleLe: new Date(), verrouillePar: user.id });

      if (courrier.workflowInstanceId) {
        // Piège TypeORM (driver pg) : contrairement à INSERT/SELECT ... RETURNING
        // (qui renvoient directement le tableau de lignes), UPDATE/DELETE ...
        // RETURNING via manager.query() renvoie le tuple [lignes, nombre de lignes
        // affectées] — vérifié empiriquement (aucune mention claire dans la doc).
        // Se tromper ici échoue silencieusement (rows[0] devient le tableau de
        // lignes lui-même, .etape_courante_id est alors toujours undefined) sans
        // jamais lever d'erreur.
        const [rows]: [Array<{ etape_courante_id: string }>, number] = await manager.query(
          `update workflow_instances set statut_instance = 'terminee', termine_le = now()
           where id = $1 and statut_instance = 'en_cours'
           returning etape_courante_id`,
          [courrier.workflowInstanceId],
        );
        const etapeCouranteId = rows[0]?.etape_courante_id;
        // Circuit départ : passage à l'étape finale « Clôturé » quand elle existe.
        const finales: Array<{ id: string; code: string; libelle: string }> = etapeCouranteId
          ? await manager.query(
              `select e.id, e.code, e.libelle from workflow_etapes e
               join workflow_instances wi on wi.workflow_definition_id = e.workflow_definition_id
               where wi.id = $1 and e.type_etape = 'finale' order by e.ordre limit 1`,
              [courrier.workflowInstanceId],
            )
          : [];
        const finale = finales[0];
        if (finale) {
          await manager.query('update workflow_instances set etape_courante_id = $2, etape_courante_depuis = now() where id = $1', [
            courrier.workflowInstanceId,
            finale.id,
          ]);
          await manager.update(Courrier, courrierId, { etapeCode: finale.code, etapeLibelle: finale.libelle });
        }
        if (etapeCouranteId) {
          await manager.save(
            WorkflowHistorique,
            manager.create(WorkflowHistorique, {
              workflowInstanceId: courrier.workflowInstanceId,
              transitionId: null,
              // Marqueur "même étape" (pas une vraie transition) — fidèle à
              // fn_ajouter_decharge_courrier, uniquement pour la trace d'audit.
              etapePrecedenteId: etapeCouranteId,
              etapeSuivanteId: finale?.id ?? etapeCouranteId,
              utilisateurId: user.id,
              commentaire: 'Décharge ajoutée — courrier clôturé',
            }),
          );
          const courrierApres = await manager.findOneByOrFail(Courrier, { id: courrierId });
          // Recette 2026-11 : l'entité traitante (responsable + personne réceptrice)
          // est prévenue de la décharge ; l'e-mail suit via le service d'envoi
          // des notifications dès que la messagerie est paramétrée.
          const auteur: Array<{ nom: string }> = await manager.query(
            "select prenom || ' ' || nom as nom from utilisateurs where id = $1",
            [user.id],
          );
          await manager.query(
            `insert into notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
             select distinct u.id, (select id from modules where code = 'courrier'), $2, $3, 'courrier', $1
             from entites e
             join utilisateurs u on u.id in (e.responsable_utilisateur_id, e.personne_receptrice_id)
             where e.id = $4 and u.id <> $5`,
            [
              courrierId,
              `Décharge reçue : ${courrierApres.numero || courrierApres.objet}`,
              `${courrierApres.objet}\nDécharge ajoutée par ${auteur[0]?.nom ?? '—'} — le courrier est clôturé.`,
              courrierApres.entiteId,
              user.id,
            ],
          );
        }
      }

      return manager.findOneByOrFail(Courrier, { id: courrierId });
    });
  }

  // --- Déverrouillage (portage de app.fn_deverrouiller_courrier, 0047) ---

  async deverrouiller(courrierId: string, motif: string, user: AuthenticatedUser): Promise<Courrier> {
    if (!motif?.trim()) throw new BadRequestException('Motif de déverrouillage requis');

    return this.dataSource.transaction(async (manager) => {
      const courrier = await manager.findOneBy(Courrier, { id: courrierId });
      if (!courrier || courrier.organisationId !== user.organisationId) {
        throw new NotFoundException('Courrier introuvable');
      }

      const autorise = await this.authorizationService.hasPermission(user.id, 'courrier', 'deverrouiller', courrier.entiteId);
      if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à déverrouiller ce courrier");

      // Entrée d'audit synthétique manuelle (pas un diff de colonnes) — même
      // logique que fn_deverrouiller_courrier, qui contourne délibérément le
      // trigger générique app.fn_audit_trigger pour tracer le motif.
      await manager.query(
        `insert into journal_audit (utilisateur_id, organisation_id, objet_type, objet_id, action_id, ancienne_valeur, nouvelle_valeur)
         values ($1, $2, 'courriers', $3, (select id from actions where code = 'deverrouiller'), $4, $5)`,
        [
          user.id,
          user.organisationId,
          courrierId,
          JSON.stringify({ verrouille_le: courrier.verrouilleLe, verrouille_par: courrier.verrouillePar }),
          JSON.stringify({ motif }),
        ],
      );

      await manager.update(Courrier, courrierId, { verrouilleLe: null, verrouillePar: null });

      if (courrier.workflowInstanceId) {
        await manager.query(
          `update workflow_instances set statut_instance = 'en_cours', termine_le = null
           where id = $1 and statut_instance = 'terminee'`,
          [courrier.workflowInstanceId],
        );
      }

      return manager.findOneByOrFail(Courrier, { id: courrierId });
    });
  }

  // --- Disque ---

  private async ecrireFichier(courrierId: string, fichier: FichierEntrant): Promise<string> {
    const relatif = `${courrierId}/${randomUUID()}-${this.nomDisque(fichier.originalname)}`;
    const absolu = this.resoudreCheminSecurise(relatif);
    await fs.mkdir(path.dirname(absolu), { recursive: true });
    await fs.writeFile(absolu, fichier.buffer);
    return relatif;
  }

  private async supprimerFichierDisque(storagePath: string): Promise<void> {
    try {
      await fs.unlink(this.resoudreCheminSecurise(storagePath));
    } catch {
      // Best-effort : un fichier déjà absent du disque ne doit pas faire
      // échouer la suppression de la ligne en base.
    }
  }

  // Défense en profondeur contre la traversée de répertoire : storagePath n'est
  // normalement jamais fourni par le client (on le génère nous-mêmes à
  // l'écriture), mais toute lecture par id le revalide quand même.
  private resoudreCheminSecurise(storagePath: string): string {
    const absolu = path.resolve(this.storageRoot, storagePath);
    if (absolu !== this.storageRoot && !absolu.startsWith(this.storageRoot + path.sep)) {
      throw new BadRequestException('Chemin de stockage invalide');
    }
    return absolu;
  }

  // Multer/busboy décode le nom de fichier en latin1 : on le ré-interprète en
  // UTF-8 (« Présentation » et non « PrÃ©sentation »), puis on garde les lettres
  // accentuées pour l'affichage. Le chemin disque, lui, reste en ASCII.
  private nomOrigine(nom: string): string {
    const recode = Buffer.from(nom, 'latin1').toString('utf8');
    return recode.includes('�') ? nom : recode;
  }

  private nomSanitise(nom: string): string {
    const base = path.basename(this.nomOrigine(nom)).replace(/[^\p{L}\p{N}._\- ()]+/gu, '_').trim();
    return base.slice(0, 200) || 'fichier';
  }

  private nomDisque(nom: string): string {
    const base = path
      .basename(this.nomOrigine(nom))
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.\- ]+/g, '_')
      .trim();
    return base.slice(0, 200) || 'fichier';
  }
}
