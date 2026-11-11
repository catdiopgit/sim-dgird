import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

// Centre de notifications (recette 2026-11) : chaque utilisateur ne lit et ne
// marque que ses propres notifications.
@Controller('notifications')
export class NotificationsController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('mes')
  async mesNotifications(@CurrentUser() user: AuthenticatedUser, @Query('limite') limite?: string) {
    const n = Math.min(Math.max(Number(limite) || 30, 1), 100);
    const [lignes, nonLues] = await Promise.all([
      this.dataSource.query(
        `select id, titre, message, objet_module as "objetModule", objet_id as "objetId",
                lien_url as "lienUrl", lu, created_at as "createdAt"
         from notifications where destinataire_id = $1
         order by created_at desc limit $2`,
        [user.id, n],
      ),
      this.dataSource.query('select count(*)::int as n from notifications where destinataire_id = $1 and not lu', [user.id]),
    ]);
    return { nonLues: nonLues[0]?.n ?? 0, notifications: lignes };
  }

  @Post(':id/lue')
  async marquerLue(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.dataSource.query(
      'update notifications set lu = true, lu_le = now() where id = $1 and destinataire_id = $2 and not lu',
      [id, user.id],
    );
    return { ok: true };
  }

  @Post('toutes-lues')
  async toutMarquerLu(@CurrentUser() user: AuthenticatedUser) {
    await this.dataSource.query(
      'update notifications set lu = true, lu_le = now() where destinataire_id = $1 and not lu',
      [user.id],
    );
    return { ok: true };
  }
}
