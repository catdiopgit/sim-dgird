import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhaseTypeMarche, type UniteDureePhase } from './entities/phase-type-marche.entity';
import { TypesMarcheService } from './types-marche.service';

export interface CreerPhaseTypeMarcheData {
  typeMarcheId: string;
  nom: string;
  description?: string | null;
  ordre?: number;
  duree?: number;
  uniteDuree?: UniteDureePhase;
  obligatoire?: boolean;
}

export interface UpdatePhaseTypeMarcheData {
  nom?: string;
  description?: string | null;
  ordre?: number;
  duree?: number;
  uniteDuree?: UniteDureePhase;
  obligatoire?: boolean;
  actif?: boolean;
}

// Phases-modèles d'un type de marché (§7) : nom, ordre, durée et caractère
// obligatoire/optionnel, entièrement paramétrables depuis l'administration.
@Injectable()
export class PhasesTypeMarcheService {
  constructor(
    @InjectRepository(PhaseTypeMarche) private readonly phases: Repository<PhaseTypeMarche>,
    private readonly typesMarcheService: TypesMarcheService,
  ) {}

  async findAll(typeMarcheId: string, organisationId: string): Promise<PhaseTypeMarche[]> {
    await this.typesMarcheService.findOne(typeMarcheId, organisationId);
    return this.phases.find({ where: { typeMarcheId }, order: { ordre: 'ASC' } });
  }

  async findOne(id: string, organisationId: string): Promise<PhaseTypeMarche> {
    const phase = await this.phases.findOneBy({ id });
    if (!phase) throw new NotFoundException('Phase-modèle introuvable');
    await this.typesMarcheService.findOne(phase.typeMarcheId, organisationId);
    return phase;
  }

  async create(organisationId: string, data: CreerPhaseTypeMarcheData): Promise<PhaseTypeMarche> {
    await this.typesMarcheService.findOne(data.typeMarcheId, organisationId);
    return this.phases.save(
      this.phases.create({
        typeMarcheId: data.typeMarcheId,
        nom: data.nom,
        description: data.description ?? null,
        ordre: data.ordre ?? 0,
        duree: data.duree ?? 1,
        uniteDuree: data.uniteDuree ?? 'jour',
        obligatoire: data.obligatoire ?? true,
      }),
    );
  }

  async update(id: string, organisationId: string, patch: UpdatePhaseTypeMarcheData): Promise<PhaseTypeMarche> {
    await this.findOne(id, organisationId);
    await this.phases.update(id, patch);
    return this.findOne(id, organisationId);
  }

  async remove(id: string, organisationId: string): Promise<void> {
    await this.findOne(id, organisationId);
    await this.phases.delete(id);
  }
}
