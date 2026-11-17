import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';

// v8.6 : notifications du circuit d'archivage (cloche + e-mail via le service
// d'envoi existant). Une erreur de notification ne bloque jamais l'action.
@Injectable()
export class GedNotificationsService {
  private readonly logger = new Logger(GedNotificationsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  async notifier(
    destinataires: Array<string | null | undefined>,
    data: { titre: string; message?: string | null; versementId: string; auteurId?: string | null },
  ): Promise<void> {
    try {
      const ids = [...new Set(destinataires.filter((d): d is string => !!d && d !== data.auteurId))];
      if (ids.length === 0) return;
      const moduleId: string | null =
        (await this.dataSource.query("select id from modules where code = 'ged'"))[0]?.id ?? null;
      for (const destinataireId of ids) {
        await this.notifications.notifier(null, {
          destinataireId,
          moduleId,
          titre: data.titre,
          message: data.message ?? null,
          objetModule: 'ged',
          objetId: data.versementId,
          lienUrl: `/ged/versements/${data.versementId}`,
        });
      }
    } catch (err) {
      this.logger.error(`Notification GED non envoyée : ${(err as Error).message}`);
    }
  }
}
