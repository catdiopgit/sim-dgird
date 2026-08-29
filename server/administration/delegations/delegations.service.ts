import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delegation } from './entities/delegation.entity';

@Injectable()
export class DelegationsService {
  constructor(@InjectRepository(Delegation) private readonly delegations: Repository<Delegation>) {}

  listPourUtilisateur(utilisateurId: string): Promise<Delegation[]> {
    return this.delegations
      .createQueryBuilder('d')
      .where('d.delegantId = :id or d.delegataireId = :id', { id: utilisateurId })
      .orderBy('d.dateDebut', 'DESC')
      .getMany();
  }

  // Pas de colonne organisation_id sur delegations (le délégant et le
  // délégataire sont nécessairement de la même organisation, contrainte
  // applicative) : on rejoint utilisateurs sur delegant_id pour l'écran
  // d'administration qui liste toutes les délégations de l'organisation
  // (contrairement à listPourUtilisateur, utilisée pour "mes délégations").
  listPourOrganisation(organisationId: string): Promise<Delegation[]> {
    return this.delegations
      .createQueryBuilder('d')
      .innerJoin('utilisateurs', 'u', 'u.id = d.delegant_id')
      .where('u.organisation_id = :organisationId', { organisationId })
      .orderBy('d.dateDebut', 'DESC')
      .getMany();
  }

  create(data: Partial<Delegation>): Promise<Delegation> {
    return this.delegations.save(this.delegations.create({ ...data, actif: true }));
  }

  async revoquer(id: string): Promise<Delegation> {
    const delegation = await this.delegations.findOneBy({ id });
    if (!delegation) throw new NotFoundException('Délégation introuvable');
    await this.delegations.update(id, { actif: false });
    return this.delegations.findOneByOrFail({ id });
  }
}
