import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { LivrablesService, type CreerLivrableData, type UpdateLivrableData } from './livrables.service';

class CreerLivrableDto implements Omit<CreerLivrableData, 'projetId'> {
  @IsString() nom: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() responsableUtilisateurId?: string | null;
  @IsOptional() @IsUUID() responsableContactId?: string | null;
  @IsOptional() @IsString() datePrevue?: string | null;
  @IsOptional() @IsUUID() statutValeurId?: string | null;
  @IsOptional() @IsNumber() poidsPct?: number;
}

class UpdateLivrableDto implements UpdateLivrableData {
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() responsableUtilisateurId?: string | null;
  @IsOptional() @IsUUID() responsableContactId?: string | null;
  @IsOptional() @IsString() datePrevue?: string | null;
  @IsOptional() @IsUUID() statutValeurId?: string | null;
  @IsOptional() @IsNumber() poidsPct?: number;
}

class CloturerLivrableDto {
  @IsOptional() @IsIn(['realise', 'valide']) statutCode?: 'realise' | 'valide';
}

@Controller('projets/:projetId/livrables')
export class LivrablesController {
  constructor(private readonly livrablesService: LivrablesService) {}

  @Get()
  findAll(@Param('projetId') projetId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.livrablesService.findAll(projetId, user);
  }

  @Post()
  create(
    @Param('projetId') projetId: string,
    @Body() dto: CreerLivrableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.livrablesService.create({ projetId, ...dto }, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLivrableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.livrablesService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.livrablesService.remove(id, user);
  }

  @Post(':id/cloturer')
  cloturer(@Param('id') id: string, @Body() dto: CloturerLivrableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.livrablesService.cloturer(id, dto.statutCode ?? 'realise', user);
  }
}
