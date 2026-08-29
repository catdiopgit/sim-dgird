import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// Réécriture TypeScript de app.fn_a_permission_directe + app.has_permission
// (supabase/migrations/0020_workflow_v2.sql) — catégorie 2 du plan de migration
// (helpers RLS devenus obsolètes). La portée 'entite_et_descendants' s'appuie
// sur l'opérateur ltree `@>` (ascendance), d'où la requête SQL brute plutôt
// qu'un QueryBuilder TypeORM classique.
@Injectable()
export class AuthorizationService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private async aPermissionDirecte(
    utilisateurId: string,
    module: string,
    action: string,
    entiteId: string | null,
  ): Promise<boolean> {
    const rows: Array<{ ok: boolean }> = await this.dataSource.query(
      `
      select exists (
        select 1
        from utilisateur_roles ur
        join permissions p on p.role_id = ur.role_id
        join modules m on m.id = p.module_id and m.code = $2
        join actions a on a.id = p.action_id and a.code = $3
        left join entites ue on ue.id = ur.entite_id
        where ur.utilisateur_id = $1
          and (ur.date_fin is null or ur.date_fin >= current_date)
          and (
            p.portee = 'organisation'
            or p.portee = 'personnel'
            or (
              $4::uuid is not null
              and (
                (p.portee = 'entite' and ur.entite_id = $4::uuid)
                or (
                  p.portee = 'entite_et_descendants'
                  and ue.chemin is not null
                  and exists (
                    select 1 from entites cible
                    where cible.id = $4::uuid
                      -- opérateur ltree qualifié explicitement : le search_path par
                      -- défaut de la connexion pg ne contient pas le schéma
                      -- extensions (où create extension ltree l'a installé, 0001).
                      and ue.chemin OPERATOR(extensions.@>) cible.chemin
                  )
                )
              )
            )
          )
      ) as ok
      `,
      [utilisateurId, module, action, entiteId],
    );
    return rows[0]?.ok ?? false;
  }

  async hasPermission(
    utilisateurId: string,
    module: string,
    action: string,
    entiteId: string | null = null,
  ): Promise<boolean> {
    if (await this.aPermissionDirecte(utilisateurId, module, action, entiteId)) {
      return true;
    }

    // Délégation (§9 cahier des charges) : le délégataire hérite temporairement
    // des permissions du délégant, dans la portée (module/entité) déléguée.
    const delegations: Array<{ delegant_id: string }> = await this.dataSource.query(
      `
      select d.delegant_id
      from delegations d
      where d.delegataire_id = $1
        and d.actif
        and d.date_debut <= current_date
        and (d.date_fin is null or d.date_fin >= current_date)
        and (d.module_id is null or d.module_id = (select id from modules where code = $2))
        and (d.entite_id is null or d.entite_id = $3::uuid)
      `,
      [utilisateurId, module, entiteId],
    );

    for (const { delegant_id } of delegations) {
      if (await this.aPermissionDirecte(delegant_id, module, action, entiteId)) {
        return true;
      }
    }

    return false;
  }
}
