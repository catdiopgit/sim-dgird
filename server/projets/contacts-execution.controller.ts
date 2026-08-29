import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ContactsExecutionService, type CreerContactExecutionData } from './contacts-execution.service';

class CreerContactExecutionDto implements Omit<CreerContactExecutionData, 'projetId'> {
  @IsString() nom: string;
  @IsOptional() @IsString() fonction?: string | null;
  @IsOptional() @IsString() email?: string | null;
  @IsOptional() @IsString() telephone?: string | null;
}

@Controller('projets/:projetId/contacts-execution')
export class ContactsExecutionController {
  constructor(private readonly contactsService: ContactsExecutionService) {}

  @Get()
  findAll(@Param('projetId') projetId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.findAll(projetId, user);
  }

  @Post()
  create(
    @Param('projetId') projetId: string,
    @Body() dto: CreerContactExecutionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactsService.create({ projetId, ...dto }, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.remove(id, user);
  }
}
