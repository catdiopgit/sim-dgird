import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionParticipantsService, type AjouterParticipantData } from './mission-participants.service';

class AjouterParticipantDto implements Omit<AjouterParticipantData, 'missionId'> {
  @IsUUID() utilisateurId: string;
  @IsOptional() @IsUUID() roleParticipantValeurId?: string | null;
}

@Controller('missions/:missionId/participants')
export class MissionParticipantsController {
  constructor(private readonly participantsService: MissionParticipantsService) {}

  @Get()
  list(@Param('missionId') missionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.participantsService.list(missionId, user);
  }

  @Post()
  ajouter(
    @Param('missionId') missionId: string,
    @Body() dto: AjouterParticipantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.participantsService.ajouter({ missionId, ...dto }, user);
  }

  @Delete(':id')
  retirer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.participantsService.retirer(id, user);
  }
}
