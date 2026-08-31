import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeMarche } from './entities/type-marche.entity';

export interface CreerTypeMarcheData {
  code: string;
  libelle: string;
  description?: string | null;
  ordre?: number;
}

export interface UpdateTypeMarcheData {
  code?: string;
  libelle?: string;
  description?: string | null;
  ordre?: number;
  actif?: boolean;
}

// Paramétrage §7 : types de marché, gérés depuis l'administration système.
// CRUD simple scopé organisation — pas de logique de visibilité (à la
// différence de Marche), la permission 'marches' suffit à contrôler l'accès.
@Injectable()
export class TypesMarcheService {
  constructor(@InjectRepository(TypeMarche) private readonly types: Repository<TypeMarche>) {}

  findAll(organisationId: string): Promise<TypeMarche[]> {
    return this.types.find({ where: { organisationId }, order: { ordre: 'ASC', libelle: 'ASC' } });
  }

  async findOne(id: string, organisationId: string): Promise<TypeMarche> {
    const type = await this.types.findOneBy({ id, organisationId });
    if (!type) throw new NotFoundException('Type de marché introuvable');
    return type;
  }

  async create(organisationId: string, data: CreerTypeMarcheData): Promise<TypeMarche> {
    try {
      return await this.types.save(
        this.types.create({
          organisationId,
          code: data.code,
          libelle: data.libelle,
          description: data.description ?? null,
          ordre: data.ordre ?? 0,
        }),
      );
    } catch (err) {
      throw this.traduireErreurCode(err, data.code);
    }
  }

  async update(id: string, organisationId: string, patch: UpdateTypeMarcheData): Promise<TypeMarche> {
    await this.findOne(id, organisationId);
    try {
      await this.types.update(id, patch);
    } catch (err) {
      throw this.traduireErreurCode(err, patch.code);
    }
    return this.findOne(id, organisationId);
  }

  async remove(id: string, organisationId: string): Promise<void> {
    await this.findOne(id, organisationId);
    await this.types.delete(id);
  }

  private traduireErreurCode(err: unknown, code?: string): unknown {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') {
      return new ConflictException(`Le code de type de marché '${code}' est déjà utilisé dans cette organisation`);
    }
    return err;
  }
}
