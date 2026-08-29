import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type { FichierEntrant } from '../ged/ged-storage.service';
import { ProjetsService } from './projets.service';
import { ProjetsDocumentsService } from './projets-documents.service';
import { Decaissement } from './entities/decaissement.entity';

export interface CreerDecaissementData {
  projetId: string;
  avenantId?: string | null;
  pourcentage: number;
  montant: number;
  dateDecaissement?: string;
  observations?: string | null;
}

export interface UpdateDecaissementData {
  pourcentage?: number;
  montant?: number;
  dateDecaissement?: string;
  observations?: string | null;
}

// Portage applicatif de app.fn_verifier_decaissement (0075, dernier corps —
// cumul par origine : avenant_id précis, ou tous ceux sans avenant pour le
// contrat d'origine). Même statut que LivrablesService.validerResponsable :
// duplique le contrôle du trigger SQL trg_decaissements_verifier pour un
// message clair (400), le trigger reste le filet de sécurité final.
@Injectable()
export class DecaissementsService {
  constructor(
    @InjectRepository(Decaissement) private readonly decaissements: Repository<Decaissement>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly projetsService: ProjetsService,
    private readonly projetsDocumentsService: ProjetsDocumentsService,
  ) {}

  async findAll(projetId: string, user: AuthenticatedUser): Promise<Decaissement[]> {
    await this.projetsService.findOne(projetId, user);
    return this.decaissements.find({ where: { projetId }, order: { dateDecaissement: 'DESC' } });
  }

  private async verifierCumul(
    projetId: string,
    avenantId: string | null,
    pourcentage: number,
    montant: number,
    excludeId: string | null,
  ): Promise<void> {
    const rows: Array<{ cumul_pct: string; cumul_montant: string }> = await this.dataSource.query(
      `select coalesce(sum(pourcentage), 0) as cumul_pct, coalesce(sum(montant), 0) as cumul_montant
       from decaissements
       where projet_id = $1 and avenant_id is not distinct from $2
         and id <> coalesce($3, '00000000-0000-0000-0000-000000000000'::uuid)`,
      [projetId, avenantId, excludeId],
    );
    const cumulPct = Number(rows[0]?.cumul_pct ?? 0);
    const cumulMontant = Number(rows[0]?.cumul_montant ?? 0);

    let montantBase: number | null = null;
    let origine: string;
    if (avenantId) {
      const avenantRows: Array<{ montant: string | null }> = await this.dataSource.query(
        'select montant from avenants where id = $1',
        [avenantId],
      );
      montantBase = avenantRows[0]?.montant != null ? Number(avenantRows[0].montant) : null;
      origine = 'pour cet avenant';
    } else {
      const projetRows: Array<{ budget_prevu: string | null }> = await this.dataSource.query(
        'select budget_prevu from projets where id = $1',
        [projetId],
      );
      montantBase = projetRows[0]?.budget_prevu != null ? Number(projetRows[0].budget_prevu) : null;
      origine = "pour le contrat d'origine";
    }

    if (cumulPct + pourcentage > 100) {
      throw new BadRequestException(
        `Le cumul des pourcentages décaissés ${origine} dépasserait 100% (déjà ${cumulPct.toFixed(2)}%)`,
      );
    }
    if (montantBase != null && cumulMontant + montant > montantBase) {
      throw new BadRequestException(
        `Le cumul des montants décaissés ${origine} (${(cumulMontant + montant).toFixed(2)}) dépasserait le montant de référence (${montantBase.toFixed(2)})`,
      );
    }
  }

  async create(data: CreerDecaissementData, user: AuthenticatedUser): Promise<Decaissement> {
    const projet = await this.projetsService.findOne(data.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    await this.verifierCumul(data.projetId, data.avenantId ?? null, data.pourcentage, data.montant, null);

    return this.decaissements.save(
      this.decaissements.create({
        projetId: data.projetId,
        avenantId: data.avenantId ?? null,
        pourcentage: data.pourcentage,
        montant: data.montant,
        dateDecaissement: data.dateDecaissement ?? new Date().toISOString().slice(0, 10),
        observations: data.observations ?? null,
        createdBy: user.id,
      }),
    );
  }

  // §5 Le justificatif est obligatoire : la ligne decaissements est créée
  // d'abord (pour obtenir son id), puis le document est déposé et rattaché via
  // ProjetsDocumentsService (p_decaissement_id) — même séquence à deux étapes
  // que ProjetsDocumentsService.ajouterDocumentAvecFichier, avec le même
  // rollback si l'upload échoue.
  async creerAvecJustificatif(
    data: CreerDecaissementData,
    titreDocument: string,
    fichier: FichierEntrant,
    user: AuthenticatedUser,
  ): Promise<Decaissement> {
    const decaissement = await this.create(data, user);
    try {
      await this.projetsDocumentsService.ajouterDocumentAvecFichier(
        { projetId: decaissement.projetId, titre: titreDocument, decaissementId: decaissement.id },
        fichier,
        user,
      );
    } catch (err) {
      await this.decaissements.delete(decaissement.id);
      throw err;
    }
    return decaissement;
  }

  async update(id: string, patch: UpdateDecaissementData, user: AuthenticatedUser): Promise<Decaissement> {
    const decaissement = await this.decaissements.findOneBy({ id });
    if (!decaissement) throw new NotFoundException('Décaissement introuvable');
    const projet = await this.projetsService.findOne(decaissement.projetId, user);
    await this.projetsService.assertModifiable(projet, user);

    if (patch.pourcentage !== undefined || patch.montant !== undefined) {
      await this.verifierCumul(
        decaissement.projetId,
        decaissement.avenantId,
        patch.pourcentage ?? Number(decaissement.pourcentage),
        patch.montant ?? Number(decaissement.montant),
        id,
      );
    }

    await this.decaissements.update(id, {
      pourcentage: patch.pourcentage,
      montant: patch.montant,
      dateDecaissement: patch.dateDecaissement,
      observations: patch.observations,
    });
    const rechargé = await this.decaissements.findOneBy({ id });
    if (!rechargé) throw new NotFoundException('Décaissement introuvable');
    return rechargé;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const decaissement = await this.decaissements.findOneBy({ id });
    if (!decaissement) throw new NotFoundException('Décaissement introuvable');
    const projet = await this.projetsService.findOne(decaissement.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    await this.decaissements.delete(id);
  }
}
