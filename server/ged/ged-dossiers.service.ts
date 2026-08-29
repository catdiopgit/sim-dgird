import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthorizationService } from '../administration/permissions/authorization.service';
import { GedDossier } from './entities/ged-dossier.entity';

export interface CreerDossierData {
  code: string;
  libelle: string;
  entiteId?: string | null;
  parentDossierId?: string | null;
  categorieId?: string | null;
  description?: string | null;
  icone?: string | null;
  couleur?: string | null;
}

export interface ModifierDossierData {
  libelle?: string;
  description?: string | null;
  categorieId?: string | null;
  icone?: string | null;
  couleur?: string | null;
  // Un parentDossierId n'est appliqué que si deplacer=true (peut valoir null
  // pour ramener le dossier à la racine) — même logique que fn_modifier_dossier_ged.
  deplacer?: boolean;
  parentDossierId?: string | null;
}

// Portage de app.fn_creer_dossier_ged / app.fn_modifier_dossier_ged.
@Injectable()
export class GedDossiersService {
  constructor(
    @InjectRepository(GedDossier) private readonly dossiers: Repository<GedDossier>,
    private readonly authorizationService: AuthorizationService,
  ) {}

  findAll(organisationId: string): Promise<GedDossier[]> {
    return this.dossiers.find({ where: { organisationId, supprimeLe: IsNull() }, order: { niveau: 'ASC' } });
  }

  async findOne(id: string): Promise<GedDossier> {
    const dossier = await this.dossiers.findOneBy({ id });
    if (!dossier) throw new NotFoundException('Dossier introuvable');
    return dossier;
  }

  async create(data: CreerDossierData, user: AuthenticatedUser): Promise<GedDossier> {
    const entiteId = data.entiteId ?? null;
    if (!(await this.authorizationService.hasPermission(user.id, 'ged', 'creer', entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à créer un dossier pour cette entité");
    }
    // chemin/niveau calculés par le trigger SQL app.set_ged_dossier_chemin.
    return this.dossiers.save(
      this.dossiers.create({
        organisationId: user.organisationId,
        entiteId,
        parentDossierId: data.parentDossierId ?? null,
        code: data.code,
        libelle: data.libelle,
        categorieId: data.categorieId ?? null,
        description: data.description ?? null,
        icone: data.icone ?? null,
        couleur: data.couleur ?? null,
        createdBy: user.id,
      }),
    );
  }

  async update(id: string, data: ModifierDossierData, user: AuthenticatedUser): Promise<GedDossier> {
    const dossier = await this.findOne(id);
    if (!(await this.authorizationService.hasPermission(user.id, 'ged', 'modifier', dossier.entiteId))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce dossier");
    }

    await this.dossiers.update(id, {
      libelle: data.libelle ?? dossier.libelle,
      description: data.description !== undefined ? data.description : dossier.description,
      categorieId: data.categorieId !== undefined ? data.categorieId : dossier.categorieId,
      icone: data.icone !== undefined ? data.icone : dossier.icone,
      couleur: data.couleur !== undefined ? data.couleur : dossier.couleur,
      ...(data.deplacer ? { parentDossierId: data.parentDossierId ?? null } : {}),
    });
    return this.findOne(id);
  }
}
