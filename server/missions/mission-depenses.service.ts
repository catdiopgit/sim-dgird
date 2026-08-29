import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionsService } from './missions.service';
import { MissionDepense } from './entities/mission-depense.entity';

export interface CreerDepenseData {
  missionId: string;
  libelle: string;
  montant: number;
  dateDepense?: string;
}

// Portage de mission_depenses_write (0016, can_modifier_mission uniquement,
// pas d'exception par ligne contrairement aux actions de suivi). budget_reel
// n'est jamais recalculé ici en TypeScript : app.trg_mission_depenses_recalcule_budget
// (0077) est un trigger SQL vivant qui se déclenche pour tout INSERT/UPDATE/DELETE
// sur mission_depenses, y compris ceux émis par TypeORM — reclassé de facto
// catégorie 7 -> catégorie 1, même raisonnement que app.sync_etape_cache
// (voir MIGRATION.md, journal Phase 2 pour le précédent).
@Injectable()
export class MissionDepensesService {
  constructor(
    @InjectRepository(MissionDepense) private readonly depenses: Repository<MissionDepense>,
    private readonly missionsService: MissionsService,
  ) {}

  async list(missionId: string, user: AuthenticatedUser): Promise<MissionDepense[]> {
    await this.missionsService.findOne(missionId, user);
    return this.depenses.find({ where: { missionId }, order: { dateDepense: 'DESC' } });
  }

  async create(data: CreerDepenseData, user: AuthenticatedUser): Promise<MissionDepense> {
    const mission = await this.missionsService.findOne(data.missionId, user);
    await this.missionsService.assertModifiable(mission, user);
    return this.depenses.save(
      this.depenses.create({
        missionId: data.missionId,
        libelle: data.libelle,
        montant: data.montant,
        dateDepense: data.dateDepense ?? new Date().toISOString().slice(0, 10),
      }),
    );
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<MissionDepense> {
    const depense = await this.depenses.findOneBy({ id });
    if (!depense) throw new NotFoundException('Dépense introuvable');
    await this.missionsService.findOne(depense.missionId, user);
    return depense;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const depense = await this.findOne(id, user);
    const mission = await this.missionsService.findOne(depense.missionId, user);
    await this.missionsService.assertModifiable(mission, user);
    await this.depenses.delete(id);
  }
}
