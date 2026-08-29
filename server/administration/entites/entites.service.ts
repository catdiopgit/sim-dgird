import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entite } from './entities/entite.entity';
import { TypeEntite } from './entities/type-entite.entity';

@Injectable()
export class EntitesService {
  constructor(
    @InjectRepository(Entite) private readonly entites: Repository<Entite>,
    @InjectRepository(TypeEntite) private readonly typeEntites: Repository<TypeEntite>,
  ) {}

  findByOrganisation(organisationId: string): Promise<Entite[]> {
    return this.entites.find({ where: { organisationId }, order: { ordre: 'ASC' } });
  }

  async findOne(id: string): Promise<Entite> {
    const entite = await this.entites.findOneBy({ id });
    if (!entite) throw new NotFoundException('Entité introuvable');
    return entite;
  }

  // `chemin` (ltree) et `niveau` sont maintenus par le trigger SQL
  // app.set_entite_chemin (catégorie 1, conservé tel quel) — non reproduits ici.
  create(data: Partial<Entite>): Promise<Entite> {
    return this.entites.save(this.entites.create(data));
  }

  async update(id: string, data: Partial<Entite>): Promise<Entite> {
    await this.findOne(id);
    await this.entites.update(id, data);
    return this.findOne(id);
  }

  listTypeEntites(organisationId: string): Promise<TypeEntite[]> {
    return this.typeEntites.find({ where: { organisationId }, order: { ordre: 'ASC' } });
  }

  createTypeEntite(data: Partial<TypeEntite>): Promise<TypeEntite> {
    return this.typeEntites.save(this.typeEntites.create(data));
  }

  async findOneTypeEntite(id: string): Promise<TypeEntite> {
    const typeEntite = await this.typeEntites.findOneBy({ id });
    if (!typeEntite) throw new NotFoundException('Type d\'entité introuvable');
    return typeEntite;
  }

  async updateTypeEntite(id: string, data: Partial<TypeEntite>): Promise<TypeEntite> {
    await this.findOneTypeEntite(id);
    await this.typeEntites.update(id, data);
    return this.findOneTypeEntite(id);
  }

  async removeTypeEntite(id: string): Promise<void> {
    await this.findOneTypeEntite(id);
    await this.typeEntites.delete(id);
  }
}
