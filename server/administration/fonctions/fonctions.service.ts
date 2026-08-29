import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fonction } from './entities/fonction.entity';

@Injectable()
export class FonctionsService {
  constructor(@InjectRepository(Fonction) private readonly fonctions: Repository<Fonction>) {}

  findByOrganisation(organisationId: string): Promise<Fonction[]> {
    return this.fonctions.find({ where: { organisationId }, order: { libelle: 'ASC' } });
  }

  async findOne(id: string): Promise<Fonction> {
    const fonction = await this.fonctions.findOneBy({ id });
    if (!fonction) throw new NotFoundException('Fonction introuvable');
    return fonction;
  }

  create(data: Partial<Fonction>): Promise<Fonction> {
    return this.fonctions.save(this.fonctions.create(data));
  }

  async remove(id: string): Promise<void> {
    await this.fonctions.delete(id);
  }

  async update(id: string, data: Partial<Fonction>): Promise<Fonction> {
    await this.findOne(id);
    await this.fonctions.update(id, data);
    return this.findOne(id);
  }
}
