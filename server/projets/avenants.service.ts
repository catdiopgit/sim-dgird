import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ProjetsService } from './projets.service';
import { Avenant } from './entities/avenant.entity';
import { AvenantLivrable, type TypeImpactAvenant } from './entities/avenant-livrable.entity';

export interface CreerAvenantData {
  projetId: string;
  reference: string;
  dateAvenant?: string;
  objet: string;
  description?: string | null;
  motif?: string | null;
  montant?: number | null;
  dureeInitiale?: string | null;
  nouvelleDuree?: string | null;
  dateDebut?: string | null;
  nouvelleDateFin?: string | null;
  observations?: string | null;
}

export interface UpdateAvenantData {
  reference?: string;
  dateAvenant?: string;
  objet?: string;
  description?: string | null;
  motif?: string | null;
  montant?: number | null;
  dureeInitiale?: string | null;
  nouvelleDuree?: string | null;
  dateDebut?: string | null;
  nouvelleDateFin?: string | null;
  observations?: string | null;
}

export interface AvenantLivrableEntree {
  livrableId: string | null;
  typeImpact: TypeImpactAvenant;
  echeanceModifiee?: boolean;
  contenuModifie?: boolean;
  commentaire?: string | null;
}

// §7 (0065) : même patron can_view_projet/can_modifier_projet que le reste du
// module (policies avenants_select/avenants_write, 0067).
@Injectable()
export class AvenantsService {
  constructor(
    @InjectRepository(Avenant) private readonly avenants: Repository<Avenant>,
    @InjectRepository(AvenantLivrable) private readonly avenantLivrables: Repository<AvenantLivrable>,
    private readonly projetsService: ProjetsService,
  ) {}

  async findOne(id: string, user: AuthenticatedUser): Promise<Avenant> {
    const avenant = await this.avenants.findOneBy({ id });
    if (!avenant) throw new NotFoundException('Avenant introuvable');
    await this.projetsService.findOne(avenant.projetId, user);
    return avenant;
  }

  async findAll(projetId: string, user: AuthenticatedUser): Promise<Avenant[]> {
    await this.projetsService.findOne(projetId, user);
    return this.avenants.find({ where: { projetId }, order: { dateAvenant: 'DESC' } });
  }

  async create(data: CreerAvenantData, user: AuthenticatedUser): Promise<Avenant> {
    const projet = await this.projetsService.findOne(data.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    return this.avenants.save(
      this.avenants.create({
        projetId: data.projetId,
        reference: data.reference,
        dateAvenant: data.dateAvenant ?? new Date().toISOString().slice(0, 10),
        objet: data.objet,
        description: data.description ?? null,
        motif: data.motif ?? null,
        montant: data.montant ?? null,
        dureeInitiale: data.dureeInitiale ?? null,
        nouvelleDuree: data.nouvelleDuree ?? null,
        dateDebut: data.dateDebut ?? null,
        nouvelleDateFin: data.nouvelleDateFin ?? null,
        observations: data.observations ?? null,
        createdBy: user.id,
      }),
    );
  }

  async update(id: string, patch: UpdateAvenantData, user: AuthenticatedUser): Promise<Avenant> {
    const avenant = await this.findOne(id, user);
    const projet = await this.projetsService.findOne(avenant.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    await this.avenants.update(id, patch);
    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const avenant = await this.findOne(id, user);
    const projet = await this.projetsService.findOne(avenant.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    await this.avenants.delete(id);
  }

  // --- Livrables impactés ---

  async listLivrablesImpactes(avenantId: string, user: AuthenticatedUser): Promise<AvenantLivrable[]> {
    await this.findOne(avenantId, user);
    return this.avenantLivrables.find({ where: { avenantId } });
  }

  async ajouterLivrableImpacte(
    avenantId: string,
    entree: AvenantLivrableEntree,
    user: AuthenticatedUser,
  ): Promise<AvenantLivrable> {
    const avenant = await this.findOne(avenantId, user);
    const projet = await this.projetsService.findOne(avenant.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    return this.avenantLivrables.save(
      this.avenantLivrables.create({
        avenantId,
        livrableId: entree.livrableId,
        typeImpact: entree.typeImpact,
        echeanceModifiee: entree.echeanceModifiee ?? false,
        contenuModifie: entree.contenuModifie ?? false,
        commentaire: entree.commentaire ?? null,
      }),
    );
  }

  async retirerLivrableImpacte(id: string, user: AuthenticatedUser): Promise<void> {
    const ligne = await this.avenantLivrables.findOneBy({ id });
    if (!ligne) throw new NotFoundException('Ligne introuvable');
    const avenant = await this.findOne(ligne.avenantId, user);
    const projet = await this.projetsService.findOne(avenant.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    await this.avenantLivrables.delete(id);
  }

  // Remplace l'ensemble des livrables impactés par cet avenant (même patron
  // "remplacer plutôt que diffuser" que ProjetVisibiliteService).
  async definirLivrablesImpactes(
    avenantId: string,
    entrees: AvenantLivrableEntree[],
    user: AuthenticatedUser,
  ): Promise<void> {
    const avenant = await this.findOne(avenantId, user);
    const projet = await this.projetsService.findOne(avenant.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    await this.avenantLivrables.delete({ avenantId });
    if (entrees.length === 0) return;
    await this.avenantLivrables.insert(
      entrees.map((e) =>
        this.avenantLivrables.create({
          avenantId,
          livrableId: e.livrableId,
          typeImpact: e.typeImpact,
          echeanceModifiee: e.echeanceModifiee ?? false,
          contenuModifie: e.contenuModifie ?? false,
          commentaire: e.commentaire ?? null,
        }),
      ),
    );
  }
}
