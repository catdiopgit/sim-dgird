import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MarchesService } from './marches.service';
import { MarchesNotificationsService } from './marches-notifications.service';
import { MarcheAttribution } from './entities/marche-attribution.entity';
import { MarcheCandidat } from './entities/marche-candidat.entity';

export interface EnregistrerAttributionData {
  candidatAttributaireId: string;
  montantAttribue?: number | null;
  dateAttribution?: string | null;
  observations?: string | null;
}

// §16 : un seul enregistrement d'attribution par marché — enregistrer() crée
// ou met à jour indifféremment (contrainte unique marche_id en base).
// L'attributaire doit appartenir aux candidats déjà enregistrés pour ce
// marché (§16 : "sélectionné parmi les entreprises/consultants enregistrés").
@Injectable()
export class MarcheAttributionsService {
  constructor(
    @InjectRepository(MarcheAttribution) private readonly attributions: Repository<MarcheAttribution>,
    @InjectRepository(MarcheCandidat) private readonly candidats: Repository<MarcheCandidat>,
    private readonly marchesService: MarchesService,
    private readonly notifications: MarchesNotificationsService,
  ) {}

  async findOne(marcheId: string, user: AuthenticatedUser): Promise<MarcheAttribution | null> {
    await this.marchesService.findOne(marcheId, user);
    return this.attributions.findOneBy({ marcheId });
  }

  async enregistrer(marcheId: string, data: EnregistrerAttributionData, user: AuthenticatedUser): Promise<MarcheAttribution> {
    const marche = await this.marchesService.findOne(marcheId, user);
    await this.marchesService.assertModifiable(marche, user);

    const candidat = await this.candidats.findOneBy({ id: data.candidatAttributaireId, marcheId });
    if (!candidat) {
      throw new BadRequestException("Le candidat sélectionné n'appartient pas à ce marché");
    }

    const existante = await this.attributions.findOneBy({ marcheId });
    if (existante) {
      await this.attributions.update(existante.id, {
        candidatAttributaireId: data.candidatAttributaireId,
        montantAttribue: data.montantAttribue ?? null,
        dateAttribution: data.dateAttribution ?? null,
        observations: data.observations ?? null,
      });
      const rechargee = await this.attributions.findOneBy({ id: existante.id });
      if (!rechargee) throw new NotFoundException('Attribution introuvable');
      await this.notifierAttribution(marche, candidat.nom, data.montantAttribue ?? null, user, true);
      return rechargee;
    }

    const creee = await this.attributions.save(
      this.attributions.create({
        marcheId,
        candidatAttributaireId: data.candidatAttributaireId,
        montantAttribue: data.montantAttribue ?? null,
        dateAttribution: data.dateAttribution ?? null,
        observations: data.observations ?? null,
        createdBy: user.id,
      }),
    );
    await this.notifierAttribution(marche, candidat.nom, data.montantAttribue ?? null, user, false);
    return creee;
  }

  // Évolutions A et E : attribution notifiée à la cellule et au responsable du
  // marché, avec une alerte si le montant attribué dépasse l'estimation.
  private async notifierAttribution(
    marche: { id: string; reference: string; objet: string; responsableId: string | null; montantEstimatif: number | null; organisationId: string },
    attributaire: string,
    montant: number | null,
    user: AuthenticatedUser,
    modification: boolean,
  ): Promise<void> {
    const format = (v: number) => new Intl.NumberFormat('fr-FR').format(v);
    const lignes = [`${marche.objet}`, `Attributaire : ${attributaire}`];
    if (montant != null) lignes.push(`Montant attribué : ${format(montant)} FCFA`);
    if (montant != null && marche.montantEstimatif != null && montant > marche.montantEstimatif) {
      lignes.push(`Attention : dépasse le montant estimatif (${format(marche.montantEstimatif)} FCFA) de ${format(montant - marche.montantEstimatif)} FCFA.`);
    }
    await this.notifications.notifier(
      [marche.responsableId, ...(await this.notifications.membresCellule(marche.organisationId))],
      {
        titre: `${modification ? 'Attribution modifiée' : 'Marché attribué'} : ${marche.reference}`,
        message: lignes.join('\n'),
        marcheId: marche.id,
        onglet: 'attribution',
        auteurId: user.id,
      },
    );
  }
}
