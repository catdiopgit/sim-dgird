import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MarcheAttributionsService, type EnregistrerAttributionData } from './marche-attributions.service';

class EnregistrerAttributionDto implements EnregistrerAttributionData {
  @IsUUID() candidatAttributaireId: string;
  @IsOptional() @IsNumber() montantAttribue?: number | null;
  @IsOptional() @IsString() dateAttribution?: string | null;
  @IsOptional() @IsString() observations?: string | null;
}

@Controller('marches/:marcheId/attribution')
export class MarcheAttributionsController {
  constructor(private readonly attributionsService: MarcheAttributionsService) {}

  @Get()
  findOne(@Param('marcheId') marcheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attributionsService.findOne(marcheId, user);
  }

  @Put()
  enregistrer(
    @Param('marcheId') marcheId: string,
    @Body() dto: EnregistrerAttributionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attributionsService.enregistrer(marcheId, dto, user);
  }
}
