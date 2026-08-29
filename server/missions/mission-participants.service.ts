import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionsService } from './missions.service';
import { MissionParticipant } from './entities/mission-participant.entity';

export interface AjouterParticipantData {
  missionId: string;
  utilisateurId: string;
  roleParticipantValeurId?: string | null;
}

// Portage des policies mission_participants_select/write (0016) : lecture via
// can_view_mission, écriture via can_modifier_mission (responsable ou
// missions/modifier — pas d'exception "peut_modifier" comme sur les membres
// de projet, la table n'a pas cette colonne).
@Injectable()
export class MissionParticipantsService {
  constructor(
    @InjectRepository(MissionParticipant) private readonly participants: Repository<MissionParticipant>,
    private readonly missionsService: MissionsService,
  ) {}

  async list(missionId: string, user: AuthenticatedUser): Promise<MissionParticipant[]> {
    await this.missionsService.findOne(missionId, user);
    return this.participants.find({ where: { missionId } });
  }

  async ajouter(data: AjouterParticipantData, user: AuthenticatedUser): Promise<MissionParticipant> {
    const mission = await this.missionsService.findOne(data.missionId, user);
    await this.missionsService.assertModifiable(mission, user);
    return this.participants.save(
      this.participants.create({
        missionId: data.missionId,
        utilisateurId: data.utilisateurId,
        roleParticipantValeurId: data.roleParticipantValeurId ?? null,
      }),
    );
  }

  async retirer(id: string, user: AuthenticatedUser): Promise<void> {
    const participant = await this.participants.findOneBy({ id });
    if (!participant) throw new NotFoundException('Participant introuvable');
    const mission = await this.missionsService.findOne(participant.missionId, user);
    await this.missionsService.assertModifiable(mission, user);
    await this.participants.delete(id);
  }
}
