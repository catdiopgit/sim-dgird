import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GedDossier } from './entities/ged-dossier.entity';
import { GedAccesService } from './ged-acces.service';
import { PLAN_CLASSEMENT_DR, type NoeudPlan } from './plan-classement-dr';

export interface CreerDossierData {
  code: string;
  libelle: string;
  entiteId?: string | null;
  parentDossierId?: string | null;
  categorieId?: string | null;
  description?: string | null;
  icone?: string | null;
  couleur?: string | null;
  ordre?: number | null;
}

export interface ModifierDossierData {
  code?: string;
  libelle?: string;
  description?: string | null;
  categorieId?: string | null;
  icone?: string | null;
  couleur?: string | null;
  ordre?: number | null;
  actif?: boolean;
  // Un parentDossierId n'est appliqué que si deplacer=true (peut valoir null
  // pour ramener le dossier à la racine).
  deplacer?: boolean;
  parentDossierId?: string | null;
}

export interface DossierPlan {
  id: string;
  organisationId: string;
  entiteId: string | null;
  parentDossierId: string | null;
  code: string;
  libelle: string;
  description: string | null;
  niveau: number;
  ordre: number;
  actif: boolean;
  icone: string | null;
  couleur: string | null;
  createdAt: Date;
  updatedAt: Date;
  nbDocuments: number;
  verrouille: boolean;
  entitesProductrices: string[];
}

// v8.6 — plan de classement modifiable par l'archiviste :
//  - code saisi à la main, modifiable tant qu'aucun document n'est classé dans
//    le dossier ou dans un de ses sous-dossiers (« verrouillé » ensuite) ;
//  - un dossier verrouillé ne peut pas être déplacé ni supprimé (il peut être
//    désactivé : il disparaît des choix de classement, ses documents restent) ;
//  - intitulé, description, ordre d'affichage et sous-dossiers restent libres ;
//  - entités productrices par série / dossier ;
//  - import initial du plan de la Direction des Routes.
@Injectable()
export class GedDossiersService {
  constructor(
    @InjectRepository(GedDossier) private readonly dossiers: Repository<GedDossier>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly acces: GedAccesService,
  ) {}

  async findAll(organisationId: string): Promise<DossierPlan[]> {
    const rows: Array<Record<string, unknown>> = await this.dataSource.query(
      `with recursive sous_arbre as (
         select id as racine_id, id from ged_dossiers where organisation_id = $1 and supprime_le is null
         union all
         select s.racine_id, g.id from ged_dossiers g join sous_arbre s on g.parent_dossier_id = s.id
         where g.supprime_le is null
       ),
       docs as (
         select dossier_id, count(*)::int as nb from documents
         where organisation_id = $1 and supprime_le is null and dossier_id is not null
         group by dossier_id
       )
       select g.*,
              coalesce(docs.nb, 0) as nb_documents,
              exists (
                select 1 from sous_arbre s join docs d2 on d2.dossier_id = s.id where s.racine_id = g.id
              ) as verrouille,
              coalesce((select array_agg(e.entite_id) from ged_dossier_entites e where e.dossier_id = g.id), '{}') as entites_productrices
       from ged_dossiers g
       left join docs on docs.dossier_id = g.id
       where g.organisation_id = $1 and g.supprime_le is null
       order by g.niveau, g.ordre, g.code`,
      [organisationId],
    );
    return rows.map((r) => ({
      id: r.id as string,
      organisationId: r.organisation_id as string,
      entiteId: (r.entite_id as string | null) ?? null,
      parentDossierId: (r.parent_dossier_id as string | null) ?? null,
      code: r.code as string,
      libelle: r.libelle as string,
      description: (r.description as string | null) ?? null,
      niveau: r.niveau as number,
      ordre: r.ordre as number,
      actif: r.actif as boolean,
      icone: (r.icone as string | null) ?? null,
      couleur: (r.couleur as string | null) ?? null,
      createdAt: r.created_at as Date,
      updatedAt: r.updated_at as Date,
      nbDocuments: r.nb_documents as number,
      verrouille: r.verrouille as boolean,
      entitesProductrices: (r.entites_productrices as string[]) ?? [],
    }));
  }

  async findOne(id: string, organisationId?: string): Promise<GedDossier> {
    const dossier = await this.dossiers.findOneBy({ id });
    if (!dossier || dossier.supprimeLe || (organisationId && dossier.organisationId !== organisationId)) {
      throw new NotFoundException('Dossier introuvable');
    }
    return dossier;
  }

  private async assertGestion(user: AuthenticatedUser): Promise<void> {
    if (!(await this.acces.peutGererPlan(user.id))) {
      throw new ForbiddenException("Seul l'archiviste (ou un administrateur) peut modifier le plan de classement");
    }
  }

  async estVerrouille(id: string): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `with recursive sous_arbre as (
         select id from ged_dossiers where id = $1
         union all
         select g.id from ged_dossiers g join sous_arbre s on g.parent_dossier_id = s.id
       ) select 1 from documents d join sous_arbre s on s.id = d.dossier_id where d.supprime_le is null limit 1`,
      [id],
    );
    return rows.length > 0;
  }

  private nettoyerCode(code: string): string {
    const c = code.trim().replace(/\s+/g, ' ');
    if (!c) throw new BadRequestException('Le code est obligatoire');
    if (c.length > 40) throw new BadRequestException('Code trop long (40 caractères au maximum)');
    return c;
  }

  private async assertCodeLibre(organisationId: string, code: string, saufId: string | null = null): Promise<void> {
    const rows: Array<{ id: string; libelle: string; supprime_le: Date | null }> = await this.dataSource.query(
      'select id, libelle, supprime_le from ged_dossiers where organisation_id = $1 and lower(code) = lower($2)',
      [organisationId, code],
    );
    const autre = rows.find((r) => r.id !== saufId);
    if (autre) throw new ConflictException(`Le code « ${code} » est déjà utilisé (« ${autre.libelle} »)`);
  }

  private async prochainOrdre(m: EntityManager, organisationId: string, parentId: string | null): Promise<number> {
    const rows: Array<{ max: number | null }> = await m.query(
      `select max(ordre) as max from ged_dossiers
       where organisation_id = $1 and supprime_le is null and parent_dossier_id is not distinct from $2`,
      [organisationId, parentId],
    );
    return (rows[0]?.max ?? 0) + 10;
  }

  async create(data: CreerDossierData, user: AuthenticatedUser): Promise<GedDossier> {
    await this.assertGestion(user);
    const code = this.nettoyerCode(data.code);
    const libelle = data.libelle?.trim();
    if (!libelle) throw new BadRequestException("L'intitulé est obligatoire");
    await this.assertCodeLibre(user.organisationId, code);
    const parentId = data.parentDossierId ?? null;
    if (parentId) {
      const parent = await this.findOne(parentId, user.organisationId);
      if (!parent) throw new NotFoundException('Dossier parent introuvable');
    }
    const ordre = data.ordre ?? (await this.prochainOrdre(this.dataSource.manager, user.organisationId, parentId));
    // chemin/niveau calculés par le trigger SQL app.set_ged_dossier_chemin.
    return this.dossiers.save(
      this.dossiers.create({
        organisationId: user.organisationId,
        entiteId: data.entiteId ?? null,
        parentDossierId: parentId,
        code,
        libelle,
        categorieId: data.categorieId ?? null,
        description: data.description ?? null,
        icone: data.icone ?? null,
        couleur: data.couleur ?? null,
        ordre,
        createdBy: user.id,
      } as Partial<GedDossier>),
    );
  }

  async update(id: string, data: ModifierDossierData, user: AuthenticatedUser): Promise<GedDossier> {
    await this.assertGestion(user);
    const dossier = await this.findOne(id, user.organisationId);
    const verrouille = await this.estVerrouille(id);

    const changements: Record<string, unknown> = {};
    if (data.code !== undefined) {
      const code = this.nettoyerCode(data.code);
      if (code !== dossier.code) {
        if (verrouille) {
          throw new BadRequestException(
            `Code verrouillé : le dossier « ${dossier.libelle} » (ou un de ses sous-dossiers) contient déjà des documents`,
          );
        }
        await this.assertCodeLibre(user.organisationId, code, id);
        changements.code = code;
      }
    }
    if (data.libelle !== undefined) {
      const libelle = data.libelle.trim();
      if (!libelle) throw new BadRequestException("L'intitulé est obligatoire");
      changements.libelle = libelle;
    }
    if (data.description !== undefined) changements.description = data.description;
    if (data.categorieId !== undefined) changements.categorieId = data.categorieId;
    if (data.icone !== undefined) changements.icone = data.icone;
    if (data.couleur !== undefined) changements.couleur = data.couleur;
    if (data.ordre !== undefined && data.ordre !== null) changements.ordre = data.ordre;
    if (data.actif !== undefined) changements.actif = data.actif;

    const nouveauParent = data.parentDossierId ?? null;
    const deplacement = data.deplacer === true && nouveauParent !== dossier.parentDossierId;
    if (deplacement) {
      if (verrouille) {
        throw new BadRequestException('Ce dossier contient des documents : il ne peut plus être déplacé');
      }
      if (nouveauParent) {
        await this.findOne(nouveauParent, user.organisationId);
        const cycle: unknown[] = await this.dataSource.query(
          `with recursive sous_arbre as (
             select id from ged_dossiers where id = $1
             union all
             select g.id from ged_dossiers g join sous_arbre s on g.parent_dossier_id = s.id
           ) select 1 from sous_arbre where id = $2 limit 1`,
          [id, nouveauParent],
        );
        if (cycle.length > 0) throw new BadRequestException('Un dossier ne peut pas être déplacé dans un de ses sous-dossiers');
      }
    }

    await this.dataSource.transaction(async (m) => {
      if (Object.keys(changements).length > 0) await m.update(GedDossier, id, changements);
      if (deplacement) {
        await m.query('update ged_dossiers set parent_dossier_id = $2 where id = $1', [id, nouveauParent]);
        await this.recalculerChemins(m, id);
      }
    });
    return this.findOne(id);
  }

  // Le trigger ne recalcule que la ligne modifiée : on « re-touche » les
  // descendants, niveau par niveau, pour qu'ils suivent le déplacement.
  private async recalculerChemins(m: EntityManager, id: string): Promise<void> {
    let parents = [id];
    for (let i = 0; i < 30 && parents.length > 0; i++) {
      const enfants: Array<{ id: string }> = await m.query(
        'update ged_dossiers set parent_dossier_id = parent_dossier_id where parent_dossier_id = any($1::uuid[]) returning id',
        [parents],
      );
      parents = enfants.map((e) => e.id);
    }
  }

  async supprimer(id: string, user: AuthenticatedUser): Promise<void> {
    await this.assertGestion(user);
    const dossier = await this.findOne(id, user.organisationId);
    if (await this.estVerrouille(id)) {
      throw new BadRequestException(
        `« ${dossier.libelle} » contient des documents : il ne peut pas être supprimé (vous pouvez le désactiver)`,
      );
    }
    const enfants = await this.dossiers.count({ where: { parentDossierId: id, supprimeLe: IsNull() } });
    if (enfants > 0) throw new BadRequestException('Supprimez ou déplacez d\'abord ses sous-dossiers');
    await this.dataSource.transaction(async (m) => {
      await m.query('update ged_versements set dossier_cible_id = null where dossier_cible_id = $1', [id]);
      await m.query('update documents set dossier_id = null where dossier_id = $1', [id]);
      await m.query('delete from ged_dossiers where id = $1', [id]);
    });
  }

  async definirEntitesProductrices(id: string, entiteIds: string[], user: AuthenticatedUser): Promise<string[]> {
    await this.assertGestion(user);
    await this.findOne(id, user.organisationId);
    const uniques = [...new Set(entiteIds)];
    await this.dataSource.transaction(async (m) => {
      await m.query('delete from ged_dossier_entites where dossier_id = $1', [id]);
      for (const entiteId of uniques) {
        await m.query(
          `insert into ged_dossier_entites (dossier_id, entite_id)
           select $1, e.id from entites e where e.id = $2 and e.organisation_id = $3`,
          [id, entiteId, user.organisationId],
        );
      }
    });
    return uniques;
  }

  // Import du plan de la Direction des Routes : uniquement sur un plan vide.
  async importerPlanDirectionRoutes(user: AuthenticatedUser): Promise<{ nbDossiers: number }> {
    await this.assertGestion(user);
    const existants = await this.dossiers.count({ where: { organisationId: user.organisationId, supprimeLe: IsNull() } });
    if (existants > 0) {
      throw new BadRequestException('Le plan de classement contient déjà des dossiers : import impossible');
    }
    let nb = 0;
    await this.dataSource.transaction(async (m) => {
      const inserer = async (noeuds: NoeudPlan[], parentId: string | null) => {
        for (const n of noeuds) {
          const id: string = (
            await m.query(
              `insert into ged_dossiers (organisation_id, parent_dossier_id, code, libelle, ordre, created_by)
               values ($1, $2, $3, $4, $5, $6) returning id`,
              [user.organisationId, parentId, n.code, n.libelle, n.ordre, user.id],
            )
          )[0].id;
          nb++;
          if (n.enfants?.length) await inserer(n.enfants, id);
        }
      };
      await inserer(PLAN_CLASSEMENT_DR, null);
    });
    return { nbDossiers: nb };
  }
}
