import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionsService } from './missions.service';
import { MissionActionSuivi } from './entities/mission-action-suivi.entity';

export interface CreerActionSuiviData {
  missionId: string;
  description: string;
  responsableId?: string | null;
  dateEcheance?: string | null;
  statutValeurId?: string | null;
}

export interface UpdateActionSuiviData {
  description?: string;
  responsableId?: string | null;
  dateEcheance?: string | null;
  statutValeurId?: string | null;
}

// Portage de mission_actions_suivi_write (0016) : contrairement aux autres
// tables filles, une action est aussi modifiable par son propre responsable
// (mission_actions_suivi.responsable_id = auth.uid()), en plus de
// can_modifier_mission — utile pour qu'un participant sans droit
// missions/modifier puisse mettre à jour l'action qui lui est assignée.
@Injectable()
export class MissionActionsSuiviService {
  constructor(
    @InjectRepository(MissionActionSuivi) private readonly actions: Repository<MissionActionSuivi>,
    private readonly missionsService: MissionsService,
  ) {}

  async list(missionId: string, user: AuthenticatedUser): Promise<MissionActionSuivi[]> {
    await this.missionsService.findOne(missionId, user);
    return this.actions.find({ where: { missionId }, order: { dateEcheance: 'ASC' } });
  }

  async create(data: CreerActionSuiviData, user: AuthenticatedUser): Promise<MissionActionSuivi> {
    const mission = await this.missionsService.findOne(data.missionId, user);
    await this.missionsService.assertModifiable(mission, user);
    return this.actions.save(
      this.actions.create({
        missionId: data.missionId,
        description: data.description,
        responsableId: data.responsableId ?? null,
        dateEcheance: data.dateEcheance ?? null,
        statutValeurId: data.statutValeurId ?? null,
      }),
    );
  }

  private async assertEcrivable(action: MissionActionSuivi, user: AuthenticatedUser): Promise<void> {
    const mission = await this.missionsService.findOne(action.missionId, user);
    if (action.responsableId === user.id) return;
    if (await this.missionsService.canModifier(mission, user)) return;
    throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette action de suivi");
  }

  async update(id: string, patch: UpdateActionSuiviData, user: AuthenticatedUser): Promise<MissionActionSuivi> {
    const action = await this.actions.findOneBy({ id });
    if (!action) throw new NotFoundException('Action de suivi introuvable');
    await this.assertEcrivable(action, user);
    await this.actions.update(id, patch);
    const rechargée = await this.actions.findOneBy({ id });
    if (!rechargée) throw new NotFoundException('Action de suivi introuvable');
    return rechargée;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const action = await this.actions.findOneBy({ id });
    if (!action) throw new NotFoundException('Action de suivi introuvable');
    await this.assertEcrivable(action, user);
    await this.actions.delete(id);
  }
}
