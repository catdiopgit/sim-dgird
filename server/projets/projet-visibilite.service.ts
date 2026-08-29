import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ProjetsService } from './projets.service';
import { ProjetVisibiliteEntite } from './entities/projet-visibilite-entite.entity';
import { ProjetVisibiliteUtilisateur } from './entities/projet-visibilite-utilisateur.entity';

// §5 (0065) : portee_visibilite = 'entites'/'agents' se résout via ces deux
// tables de sélection — remplace l'ensemble en une fois (patron déjà utilisé
// par AvenantsService.definirLivrablesImpactes).
@Injectable()
export class ProjetVisibiliteService {
  constructor(
    @InjectRepository(ProjetVisibiliteEntite) private readonly entites: Repository<ProjetVisibiliteEntite>,
    @InjectRepository(ProjetVisibiliteUtilisateur) private readonly utilisateurs: Repository<ProjetVisibiliteUtilisateur>,
    private readonly projetsService: ProjetsService,
  ) {}

  async listEntites(projetId: string, user: AuthenticatedUser): Promise<ProjetVisibiliteEntite[]> {
    await this.projetsService.findOne(projetId, user);
    return this.entites.find({ where: { projetId } });
  }

  async listUtilisateurs(projetId: string, user: AuthenticatedUser): Promise<ProjetVisibiliteUtilisateur[]> {
    await this.projetsService.findOne(projetId, user);
    return this.utilisateurs.find({ where: { projetId } });
  }

  async definirEntites(projetId: string, entiteIds: string[], user: AuthenticatedUser): Promise<void> {
    const projet = await this.projetsService.findOne(projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    await this.entites.delete({ projetId });
    if (entiteIds.length === 0) return;
    await this.entites.insert(entiteIds.map((entiteId) => this.entites.create({ projetId, entiteId })));
  }

  async definirUtilisateurs(projetId: string, utilisateurIds: string[], user: AuthenticatedUser): Promise<void> {
    const projet = await this.projetsService.findOne(projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    await this.utilisateurs.delete({ projetId });
    if (utilisateurIds.length === 0) return;
    await this.utilisateurs.insert(
      utilisateurIds.map((utilisateurId) => this.utilisateurs.create({ projetId, utilisateurId })),
    );
  }
}
