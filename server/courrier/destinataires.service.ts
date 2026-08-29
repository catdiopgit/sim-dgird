import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CourrierDestinataire } from './entities/courrier-destinataire.entity';
import { CourrierDestinataireAction } from './entities/courrier-destinataire-action.entity';
import { CourriersService } from './courriers.service';

export interface AjouterDestinataireData {
  courrierId: string;
  entiteId?: string | null;
  utilisateurId?: string | null;
  contactId?: string | null;
  typeDiffusion?: 'principal' | 'copie';
  instruction?: string | null;
  echeance?: string | null;
}

// Portage des écritures directes sur courrier_destinataires/
// courrier_destinataire_actions (RLS courrier_destinataires_write, 0038) —
// hors du flux app.fn_imputer_courrier, utilisé pour de simples ajouts de
// copie ou la prise de connaissance.
@Injectable()
export class DestinatairesService {
  constructor(
    @InjectRepository(CourrierDestinataire) private readonly destinataires: Repository<CourrierDestinataire>,
    @InjectRepository(CourrierDestinataireAction) private readonly actions: Repository<CourrierDestinataireAction>,
    private readonly courriersService: CourriersService,
  ) {}

  async listByCourrier(courrierId: string, user: AuthenticatedUser): Promise<CourrierDestinataire[]> {
    await this.courriersService.findOne(courrierId, user); // 404 si non visible
    return this.destinataires.find({ where: { courrierId } });
  }

  async create(data: AjouterDestinataireData, user: AuthenticatedUser): Promise<CourrierDestinataire> {
    const courrier = await this.courriersService.findOne(data.courrierId, user);
    await this.courriersService.assertWritable(courrier, user);
    return this.destinataires.save(this.destinataires.create(data));
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const destinataire = await this.destinataires.findOneBy({ id });
    if (!destinataire) throw new NotFoundException('Destinataire introuvable');
    const courrier = await this.courriersService.findOne(destinataire.courrierId, user);
    await this.courriersService.assertWritable(courrier, user);
    await this.destinataires.delete(id);
  }

  async marquerPriseConnaissance(id: string, user: AuthenticatedUser): Promise<CourrierDestinataire> {
    const destinataire = await this.destinataires.findOneBy({ id });
    if (!destinataire) throw new NotFoundException('Destinataire introuvable');
    const courrier = await this.courriersService.findOne(destinataire.courrierId, user);
    await this.courriersService.assertWritable(courrier, user);
    await this.destinataires.update(id, { datePriseConnaissance: new Date() });
    return this.destinataires.findOneByOrFail({ id });
  }

  async listActionsDemandees(destinataireId: string, user: AuthenticatedUser): Promise<string[]> {
    const destinataire = await this.destinataires.findOneBy({ id: destinataireId });
    if (!destinataire) throw new NotFoundException('Destinataire introuvable');
    await this.courriersService.findOne(destinataire.courrierId, user); // 404 si non visible
    const rows = await this.actions.find({ where: { courrierDestinataireId: destinataireId } });
    return rows.map((r) => r.valeurListeId);
  }
}
