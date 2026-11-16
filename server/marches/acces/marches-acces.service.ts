import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../../administration/permissions/authorization.service';

export interface CelluleMarches {
  entiteId: string;
  libelle: string;
  responsableId: string | null;
}

export interface AccesMarches {
  cellule: CelluleMarches | null;
  // Membre de la cellule (rattaché à elle ou à une de ses sous-entités) :
  // peut créer un marché et agir sur tous les marchés.
  membre: boolean;
  // Chef de cellule (responsable de l'entité) : seul à pouvoir clôturer ou
  // supprimer un marché.
  chef: boolean;
  // Peut paramétrer les types de marché et leurs phases.
  parametrage: boolean;
}

// Recette 2026-11 : seuls les membres de la cellule de passation des marchés
// créent les marchés et agissent dessus. La cellule est l'entité désignée par
// le paramètre d'organisation « marches_cellule_entite_id » ({"entiteId": …}) ;
// à défaut, l'entité dont le libellé contient « passation » et « march ».
//
// Service sans dépendance vers MarchesModule : la GED l'utilise aussi pour
// ouvrir les documents d'un marché à ceux qui voient ce marché.
@Injectable()
export class MarchesAccesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async cellule(organisationId: string): Promise<CelluleMarches | null> {
    const rows: Array<{ id: string; libelle: string; responsable_utilisateur_id: string | null }> = await this.dataSource.query(
      `select id, libelle, responsable_utilisateur_id from (
         select e.id, e.libelle, e.responsable_utilisateur_id, 0 as priorite from entites e
         where e.organisation_id = $1 and e.id = (
           select (p.valeur->>'entiteId')::uuid from parametres_organisation p
           where p.organisation_id = $1 and p.cle = 'marches_cellule_entite_id' limit 1)
         union all
         select e.id, e.libelle, e.responsable_utilisateur_id, 1 + length(e.libelle) from entites e
         where e.organisation_id = $1 and e.libelle ilike '%passation%' and e.libelle ilike '%march%'
       ) c order by priorite limit 1`,
      [organisationId],
    );
    const r = rows[0];
    return r ? { entiteId: r.id, libelle: r.libelle, responsableId: r.responsable_utilisateur_id } : null;
  }

  // Membre : rattaché à la cellule ou à une de ses sous-entités, ou responsable
  // de la cellule même s'il est rattaché ailleurs.
  async acces(user: AuthenticatedUser): Promise<AccesMarches> {
    const cellule = await this.cellule(user.organisationId);
    if (!cellule) return { cellule: null, membre: false, chef: false, parametrage: false };
    const chef = cellule.responsableId === user.id;
    let membre = chef;
    if (!membre && user.entiteId) {
      const rows: unknown[] = await this.dataSource.query(
        `with recursive branche as (
           select id from entites where id = $1
           union all
           select e.id from entites e join branche b on e.parent_entite_id = b.id
         ) select 1 from branche where id = $2 limit 1`,
        [cellule.entiteId, user.entiteId],
      );
      membre = rows.length > 0;
    }
    return { cellule, membre, chef, parametrage: false };
  }

  // Responsable de l'entité porteuse ou d'une entité parente.
  async estResponsableHierarchique(entiteId: string, utilisateurId: string): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `with recursive chaine as (
         select id, parent_entite_id, responsable_utilisateur_id, 0 as niveau from entites where id = $1
         union all
         select p.id, p.parent_entite_id, p.responsable_utilisateur_id, c.niveau + 1
         from entites p join chaine c on p.id = c.parent_entite_id where c.niveau < 20
       ) select 1 from chaine where responsable_utilisateur_id = $2 limit 1`,
      [entiteId, utilisateurId],
    );
    return rows.length > 0;
  }

  // Paramétrage des types de marché et de leurs phases (recette 2026-11) :
  // membres de la cellule de passation, et administrateurs (administration /
  // modifier, ou marchés / modifier sur une portée étendue).
  async peutParametrer(user: AuthenticatedUser): Promise<boolean> {
    if ((await this.acces(user)).membre) return true;
    if (await this.authorizationService.hasPermissionEtendue(user.id, 'administration', 'modifier')) return true;
    return this.authorizationService.hasPermissionEtendue(user.id, 'marches', 'modifier');
  }

  // Qui voit un marché : la cellule, le responsable du marché, le responsable
  // de l'entité porteuse (ou d'une parente), et les rôles ayant « marchés /
  // consulter » sur une portée étendue (la portée « personnel » ne suffit plus).
  async peutVoir(
    marche: { organisationId: string; responsableId: string | null; entiteId: string },
    user: AuthenticatedUser,
  ): Promise<boolean> {
    if (marche.organisationId !== user.organisationId) return false;
    if (marche.responsableId === user.id) return true;
    if ((await this.acces(user)).membre) return true;
    if (await this.estResponsableHierarchique(marche.entiteId, user.id)) return true;
    return this.authorizationService.hasPermissionEtendue(user.id, 'marches', 'consulter', marche.entiteId);
  }

  async membresCellule(organisationId: string): Promise<string[]> {
    const cellule = await this.cellule(organisationId);
    if (!cellule) return [];
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `with recursive branche as (
         select id from entites where id = $1
         union all
         select e.id from entites e join branche b on e.parent_entite_id = b.id
       )
       select u.id from utilisateurs u
       where u.statut = 'actif' and (u.entite_id in (select id from branche) or u.id = $2)`,
      [cellule.entiteId, cellule.responsableId],
    );
    return rows.map((r) => r.id);
  }
}
