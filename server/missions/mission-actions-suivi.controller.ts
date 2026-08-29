import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  MissionActionsSuiviService,
  type CreerActionSuiviData,
  type UpdateActionSuiviData,
} from './mission-actions-suivi.service';

class CreerActionSuiviDto implements Omit<CreerActionSuiviData, 'missionId'> {
  @IsString() description: string;
  @IsOptional() @IsUUID() responsableId?: string | null;
  @IsOptional() @IsString() dateEcheance?: string | null;
  @IsOptional() @IsUUID() statutValeurId?: string | null;
}

class UpdateActionSuiviDto implements UpdateActionSuiviData {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() responsableId?: string | null;
  @IsOptional() @IsString() dateEcheance?: string | null;
  @IsOptional() @IsUUID() statutValeurId?: string | null;
}

@Controller('missions/:missionId/actions-suivi')
export class MissionActionsSuiviController {
  constructor(private readonly actionsService: MissionActionsSuiviService) {}

  @Get()
  list(@Param('missionId') missionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.actionsService.list(missionId, user);
  }

  @Post()
  create(
    @Param('missionId') missionId: string,
    @Body() dto: CreerActionSuiviDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.actionsService.create({ missionId, ...dto }, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActionSuiviDto, @CurrentUser() user: AuthenticatedUser) {
    return this.actionsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.actionsService.remove(id, user);
  }
}
