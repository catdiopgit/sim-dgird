import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PermissionsGuard } from '../administration/permissions/permissions.guard';
import { RequirePermission } from '../administration/permissions/require-permission.decorator';
import { TypesMarcheService, type CreerTypeMarcheData, type UpdateTypeMarcheData } from './types-marche.service';

class CreerTypeMarcheDto implements CreerTypeMarcheData {
  @IsString() code: string;
  @IsString() libelle: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsInt() ordre?: number;
}

class UpdateTypeMarcheDto implements UpdateTypeMarcheData {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() libelle?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsInt() ordre?: number;
  @IsOptional() @IsBoolean() actif?: boolean;
}

@Controller('marches/types')
@UseGuards(PermissionsGuard)
export class TypesMarcheController {
  constructor(private readonly typesMarcheService: TypesMarcheService) {}

  @Get()
  @RequirePermission('marches', 'consulter')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.typesMarcheService.findAll(user.organisationId);
  }

  @Get(':id')
  @RequirePermission('marches', 'consulter')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.typesMarcheService.findOne(id, user.organisationId);
  }

  @Post()
  @RequirePermission('marches', 'creer')
  create(@Body() dto: CreerTypeMarcheDto, @CurrentUser() user: AuthenticatedUser) {
    return this.typesMarcheService.create(user.organisationId, dto);
  }

  @Patch(':id')
  @RequirePermission('marches', 'modifier')
  update(@Param('id') id: string, @Body() dto: UpdateTypeMarcheDto, @CurrentUser() user: AuthenticatedUser) {
    return this.typesMarcheService.update(id, user.organisationId, dto);
  }

  @Delete(':id')
  @RequirePermission('marches', 'modifier')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.typesMarcheService.remove(id, user.organisationId);
  }
}
