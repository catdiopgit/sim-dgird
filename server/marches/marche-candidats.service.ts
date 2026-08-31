import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MarchesService } from './marches.service';
import { MarcheCandidat, type TypeCandidatMarche } from './entities/marche-candidat.entity';

export interface CreerMarcheCandidatData {
  marcheId: string;
  nom: string;
  type: TypeCandidatMarche;
  coordonnees?: string | null;
  informationsComplementaires?: string | null;
}

export interface UpdateMarcheCandidatData {
  nom?: string;
  type?: TypeCandidatMarche;
  coordonnees?: string | null;
  informationsComplementaires?: string | null;
}

// §15 : entreprises/consultants participant à la procédure — fonctionnalité
// optionnelle. Offres technique/financière rattachées via `documents`
// (ged/marches-documents.controller.ts), pas ici.
@Injectable()
export class MarcheCandidatsService {
  constructor(
    @InjectRepository(MarcheCandidat) private readonly candidats: Repository<MarcheCandidat>,
    private readonly marchesService: MarchesService,
  ) {}

  async findAll(marcheId: string, user: AuthenticatedUser): Promise<MarcheCandidat[]> {
    await this.marchesService.findOne(marcheId, user);
    return this.candidats.find({ where: { marcheId }, order: { createdAt: 'ASC' } });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<MarcheCandidat> {
    const candidat = await this.candidats.findOneBy({ id });
    if (!candidat) throw new NotFoundException('Candidat introuvable');
    await this.marchesService.findOne(candidat.marcheId, user);
    return candidat;
  }

  async create(data: CreerMarcheCandidatData, user: AuthenticatedUser): Promise<MarcheCandidat> {
    const marche = await this.marchesService.findOne(data.marcheId, user);
    await this.marchesService.assertModifiable(marche, user);
    return this.candidats.save(
      this.candidats.create({
        marcheId: data.marcheId,
        nom: data.nom,
        type: data.type,
        coordonnees: data.coordonnees ?? null,
        informationsComplementaires: data.informationsComplementaires ?? null,
      }),
    );
  }

  async update(id: string, patch: UpdateMarcheCandidatData, user: AuthenticatedUser): Promise<MarcheCandidat> {
    const candidat = await this.findOne(id, user);
    const marche = await this.marchesService.findOne(candidat.marcheId, user);
    await this.marchesService.assertModifiable(marche, user);
    await this.candidats.update(id, patch);
    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const candidat = await this.findOne(id, user);
    const marche = await this.marchesService.findOne(candidat.marcheId, user);
    await this.marchesService.assertModifiable(marche, user);
    const attributionRows: Array<{ id: string }> = await this.candidats.manager.query(
      'select id from marche_attributions where candidat_attributaire_id = $1',
      [id],
    );
    if (attributionRows.length > 0) {
      throw new BadRequestException('Impossible de supprimer un candidat attributaire du marché');
    }
    await this.candidats.delete(id);
  }
}
