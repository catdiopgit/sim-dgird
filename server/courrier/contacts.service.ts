import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { Contact } from './entities/contact.entity';

// Portage de la policy RLS contacts_write : organisation_id = caller.org AND
// (has_permission('courrier','creer') OR has_permission('courrier','modifier')),
// sans portée entité (les contacts sont globaux à l'organisation).
@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    private readonly authorizationService: AuthorizationService,
  ) {}

  findAll(organisationId: string, recherche?: string): Promise<Contact[]> {
    return this.contacts.find({
      where: {
        organisationId,
        supprimeLe: IsNull(),
        ...(recherche ? { nom: ILike(`%${recherche}%`) } : {}),
      },
      order: { nom: 'ASC' },
      take: 50,
    });
  }

  async create(data: Partial<Contact>, user: AuthenticatedUser): Promise<Contact> {
    const autorise =
      (await this.authorizationService.hasPermission(user.id, 'courrier', 'creer')) ||
      (await this.authorizationService.hasPermission(user.id, 'courrier', 'modifier'));
    if (!autorise) throw new ForbiddenException("Vous n'êtes pas autorisé à créer un contact");
    return this.contacts.save(this.contacts.create({ ...data, organisationId: user.organisationId }));
  }
}
