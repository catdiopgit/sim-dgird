import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  MarcheCandidatsService,
  type CreerMarcheCandidatData,
  type UpdateMarcheCandidatData,
} from './marche-candidats.service';
import type { TypeCandidatMarche } from './entities/marche-candidat.entity';

const TYPES_CANDIDAT: TypeCandidatMarche[] = ['entreprise', 'consultant'];

class CreerMarcheCandidatDto implements Omit<CreerMarcheCandidatData, 'marcheId'> {
  @IsString() nom: string;
  @IsIn(TYPES_CANDIDAT) type: TypeCandidatMarche;
  @IsOptional() @IsString() coordonnees?: string | null;
  @IsOptional() @IsString() informationsComplementaires?: string | null;
}

class UpdateMarcheCandidatDto implements UpdateMarcheCandidatData {
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsIn(TYPES_CANDIDAT) type?: TypeCandidatMarche;
  @IsOptional() @IsString() coordonnees?: string | null;
  @IsOptional() @IsString() informationsComplementaires?: string | null;
}

@Controller('marches/:marcheId/candidats')
export class MarcheCandidatsController {
  constructor(private readonly candidatsService: MarcheCandidatsService) {}

  @Get()
  findAll(@Param('marcheId') marcheId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.candidatsService.findAll(marcheId, user);
  }

  @Post()
  create(@Param('marcheId') marcheId: string, @Body() dto: CreerMarcheCandidatDto, @CurrentUser() user: AuthenticatedUser) {
    return this.candidatsService.create({ marcheId, ...dto }, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMarcheCandidatDto, @CurrentUser() user: AuthenticatedUser) {
    return this.candidatsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.candidatsService.remove(id, user);
  }
}
