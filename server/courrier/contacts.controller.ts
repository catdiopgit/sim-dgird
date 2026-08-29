import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ContactsService } from './contacts.service';
import type { TypeContact } from './entities/contact.entity';

class CreerContactDto {
  @IsString() nom: string;
  @IsOptional() @IsIn(['personne', 'entreprise', 'administration']) type?: TypeContact;
  @IsOptional() @IsString() email?: string | null;
  @IsOptional() @IsString() telephone?: string | null;
  @IsOptional() @IsString() adresse?: string | null;
}

@Controller('courrier/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('recherche') recherche?: string) {
    return this.contactsService.findAll(user.organisationId, recherche);
  }

  @Post()
  create(@Body() dto: CreerContactDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.create(dto, user);
  }
}
