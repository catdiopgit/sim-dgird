import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ProjetsService } from './projets.service';
import { ProjetContactExecution } from './entities/projet-contact-execution.entity';

export interface CreerContactExecutionData {
  projetId: string;
  nom: string;
  fonction?: string | null;
  email?: string | null;
  telephone?: string | null;
}

@Injectable()
export class ContactsExecutionService {
  constructor(
    @InjectRepository(ProjetContactExecution) private readonly contacts: Repository<ProjetContactExecution>,
    private readonly projetsService: ProjetsService,
  ) {}

  async findAll(projetId: string, user: AuthenticatedUser): Promise<ProjetContactExecution[]> {
    await this.projetsService.findOne(projetId, user);
    return this.contacts.find({ where: { projetId }, order: { createdAt: 'ASC' } });
  }

  async create(data: CreerContactExecutionData, user: AuthenticatedUser): Promise<ProjetContactExecution> {
    const projet = await this.projetsService.findOne(data.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    return this.contacts.save(
      this.contacts.create({
        projetId: data.projetId,
        nom: data.nom,
        fonction: data.fonction ?? null,
        email: data.email ?? null,
        telephone: data.telephone ?? null,
        createdBy: user.id,
      }),
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const contact = await this.contacts.findOneBy({ id });
    if (!contact) throw new NotFoundException('Contact introuvable');
    const projet = await this.projetsService.findOne(contact.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    await this.contacts.delete(id);
  }
}
