import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ProjetsService } from './projets.service';
import { ProjetMembre } from './entities/projet-membre.entity';

export interface AjouterMembreData {
  projetId: string;
  utilisateurId: string;
  roleEquipeValeurId?: string | null;
  peutModifier?: boolean;
}

// Table filles gardée par app.can_modifier_projet/can_view_projet (patron
// 0074) — un retrait ne supprime jamais la ligne, il pose date_retrait (index
// unique partiel du schéma sur (projet_id, utilisateur_id) where date_retrait
// is null, pour garder l'historique des anciens membres).
@Injectable()
export class ProjetMembresService {
  constructor(
    @InjectRepository(ProjetMembre) private readonly membres: Repository<ProjetMembre>,
    private readonly projetsService: ProjetsService,
  ) {}

  async listActifs(projetId: string, user: AuthenticatedUser): Promise<ProjetMembre[]> {
    await this.projetsService.findOne(projetId, user);
    return this.membres.find({
      where: { projetId, dateRetrait: IsNull() },
      order: { dateAjout: 'ASC' },
    });
  }

  async ajouter(data: AjouterMembreData, user: AuthenticatedUser): Promise<ProjetMembre> {
    const projet = await this.projetsService.findOne(data.projetId, user);
    await this.projetsService.assertModifiable(projet, user);
    return this.membres.save(
      this.membres.create({
        projetId: data.projetId,
        utilisateurId: data.utilisateurId,
        roleEquipeValeurId: data.roleEquipeValeurId ?? null,
        dateAjout: new Date().toISOString().slice(0, 10),
        peutModifier: data.peutModifier ?? true,
      }),
    );
  }

  async retirer(id: string, user: AuthenticatedUser): Promise<void> {
    const membre = await this.membres.findOneBy({ id });
    if (!membre) throw new NotFoundException('Membre introuvable');
    const projet = await this.projetsService.findOne(membre.projetId, user);
    if (!(await this.projetsService.canModifier(projet, user))) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à retirer ce membre");
    }
    await this.membres.update(id, { dateRetrait: new Date().toISOString().slice(0, 10) });
  }
}
