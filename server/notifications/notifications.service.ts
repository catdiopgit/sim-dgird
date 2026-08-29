import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Accepte un EntityManager explicite pour composer dans la transaction de
  // l'appelant (ex. CourriersService.creerCourrier) ; utilise sa propre connexion
  // sinon.
  async notifier(
    manager: EntityManager | null,
    data: {
      destinataireId: string;
      moduleId: string | null;
      titre: string;
      message?: string | null;
      objetModule?: string | null;
      objetId?: string | null;
    },
  ): Promise<void> {
    const m = manager ?? this.dataSource.manager;
    await m.save(
      Notification,
      m.create(Notification, {
        destinataireId: data.destinataireId,
        moduleId: data.moduleId,
        titre: data.titre,
        message: data.message ?? null,
        objetModule: data.objetModule ?? null,
        objetId: data.objetId ?? null,
      }),
    );
  }
}
