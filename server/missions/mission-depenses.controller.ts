import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionDepensesService, type CreerDepenseData } from './mission-depenses.service';

class CreerDepenseDto implements Omit<CreerDepenseData, 'missionId'> {
  @IsString() libelle: string;
  @IsNumber() montant: number;
  @IsOptional() @IsString() dateDepense?: string;
}

@Controller('missions/:missionId/depenses')
export class MissionDepensesController {
  constructor(private readonly depensesService: MissionDepensesService) {}

  @Get()
  list(@Param('missionId') missionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.depensesService.list(missionId, user);
  }

  @Post()
  create(
    @Param('missionId') missionId: string,
    @Body() dto: CreerDepenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depensesService.create({ missionId, ...dto }, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.depensesService.remove(id, user);
  }
}
