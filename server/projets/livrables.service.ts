import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ProjetsService } from './projets.service';
import { Livrable } from './entities/livrable.entity';

export interface CreerLivrableData {
  projetId: string;
  nom: string;
  description?: string | null;
  responsableUtilisateurId?: string | null;
  responsableContactId?: string | null;
  datePrevue?: string | null;
  statutValeurId?: string | null;
  poidsPct?: number;
}

export interface UpdateLivrableData {
  nom?: string;
  description?: string | null;
  responsableUtilisateurId?: string | null;
  responsableContactId?: string | null;
  datePrevue?: string | null;
  statutValeurId?: string | null;
  poidsPct?: number;
}

// Portage de app.fn_cloturer_livrable (0073, dernier corps — projet_id direct,
// plus de join activite/phase). app.fn_recalculer_avancement_projet et
// app.fn_verifier_responsable_livrable (0073) restent des triggers SQL vivants
// (trg_livrables_recalcule_avancement / trg_livrables_verifier_responsable) —
// même statut que app.fn_audit_trigger (catégorie 1 de facto, voir
// MIGRATION.md) : ils se déclenchent automatiquement sur toute écriture
// TypeORM sur `livrables`, sans code applicatif dédié. La validation
// responsable/contact ci-dessous ne fait que dupliquer ce contrôle côté
// application pour renvoyer un message clair (400) avant de toucher la base,
// plutôt que de laisser remonter l'erreur PL/pgSQL brute — la fonction/trigger
// SQL reste le filet de sécurité final.
@Injectable()
export class LivrablesService {
  constructor(
    @InjectRepository(Livrable) private readonly livrables: Repository<Livrable>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly projetsService: ProjetsService,
  ) {}

  async findOne(id: string, user: AuthenticatedUser): Promise<Livrable> {
    const livrable = await this.livrables.findOneBy({ id });
    if (!livrable) throw new NotFoundException('Livrable introuvable');
    await this.projetsService.findOne(livrable.projetId, user); // 404 si projet non visible
    return livrable;
  }

  async findAll(projetId: string, user: AuthenticatedUser): Promise<Livrable[]> {
    await this.projetsService.findOne(projetId, user);
    return this.livrables.find({ where: { projetId }, order: { createdAt: 'ASC' } });
  }

  async create(data: CreerLivrableData, user: AuthenticatedUser): Promise<Livrable> {
    const projet = await this.projetsService.findOne(data.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    await this.validerResponsable(data.projetId, data.responsableUtilisateurId ?? null, data.responsableContactId ?? null);

    return this.livrables.save(
      this.livrables.create({
        projetId: data.projetId,
        nom: data.nom,
        description: data.description ?? null,
        responsableUtilisateurId: data.responsableUtilisateurId ?? null,
        responsableContactId: data.responsableContactId ?? null,
        datePrevue: data.datePrevue ?? null,
        statutValeurId: data.statutValeurId ?? null,
        poidsPct: data.poidsPct ?? 0,
      }),
    );
  }

  // Le responsable du livrable garde la main dessus même sans droit d'écriture
  // global sur le projet (livrables_write, 0074).
  async update(id: string, patch: UpdateLivrableData, user: AuthenticatedUser): Promise<Livrable> {
    const livrable = await this.findOne(id, user);
    const projet = await this.projetsService.findOne(livrable.projetId, user);
    const autorise = livrable.responsableUtilisateurId === user.id || (await this.projetsService.canModifier(projet, user));
    if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce livrable");

    if (patch.responsableUtilisateurId !== undefined || patch.responsableContactId !== undefined) {
      await this.validerResponsable(
        livrable.projetId,
        patch.responsableUtilisateurId !== undefined ? patch.responsableUtilisateurId : livrable.responsableUtilisateurId,
        patch.responsableContactId !== undefined ? patch.responsableContactId : livrable.responsableContactId,
      );
    }

    await this.livrables.update(id, patch);
    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const livrable = await this.findOne(id, user);
    const projet = await this.projetsService.findOne(livrable.projetId, user);
    const autorise = livrable.responsableUtilisateurId === user.id || (await this.projetsService.canModifier(projet, user));
    if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer ce livrable");
    await this.livrables.delete(id);
  }

  // §3 Règle obligatoire : un livrable ne peut passer "réalisé"/"validé" que
  // s'il a au moins un document justificatif associé.
  async cloturer(id: string, statutCode: 'realise' | 'valide', user: AuthenticatedUser): Promise<Livrable> {
    if (statutCode !== 'realise' && statutCode !== 'valide') {
      throw new BadRequestException(`Statut de clôture invalide : ${statutCode}`);
    }
    const livrable = await this.findOne(id, user);
    const projet = await this.projetsService.findOne(livrable.projetId, user);
    await this.projetsService.assertModifiable(projet, user);

    const nbDocuments = await this.dataSource
      .query('select count(*) as count from documents where livrable_id = $1 and supprime_le is null', [id])
      .then((rows) => Number(rows[0]?.count ?? 0));
    if (nbDocuments === 0) {
      throw new BadRequestException('Impossible de clôturer le livrable : aucun document justificatif associé');
    }

    const statutRows: Array<{ id: string }> = await this.dataSource.query(
      `select vl.id from valeurs_listes vl
       join listes_valeurs l on l.id = vl.liste_id
       where l.organisation_id = $1 and l.code = 'livrable_statut' and vl.code = $2`,
      [projet.organisationId, statutCode],
    );

    await this.livrables.update(id, {
      statutValeurId: statutRows[0]?.id ?? livrable.statutValeurId,
      dateRemise: livrable.dateRemise ?? new Date().toISOString().slice(0, 10),
    });
    return this.findOne(id, user);
  }

  // Portage applicatif de app.fn_verifier_responsable_livrable (0073).
  private async validerResponsable(
    projetId: string,
    responsableUtilisateurId: string | null,
    responsableContactId: string | null,
  ): Promise<void> {
    if (responsableUtilisateurId != null) {
      const rows = await this.dataSource.query(
        `select 1 from projet_membres where projet_id = $1 and utilisateur_id = $2 and date_retrait is null`,
        [projetId, responsableUtilisateurId],
      );
      if (rows.length === 0) {
        throw new BadRequestException('Le responsable doit être un membre actif du projet');
      }
    }
    if (responsableContactId != null) {
      const rows = await this.dataSource.query(
        `select 1 from projet_contacts_execution where id = $1 and projet_id = $2`,
        [responsableContactId, projetId],
      );
      if (rows.length === 0) {
        throw new BadRequestException("Le contact responsable n'appartient pas à ce projet");
      }
    }
  }
}
