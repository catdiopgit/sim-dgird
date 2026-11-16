import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';

// Évolution B (recette 2026-11) : notifications du module Projets, sur le
// modèle du courrier. Chaque notification part aussi par e-mail dès que le
// SMTP de l'organisation est configuré (EmailNotificationsService).
//
// - demande de clôture → validateur (responsable de l'entité porteuse, ou du
//   premier parent qui en a un) ;
// - confirmation ou rejet de la clôture → responsable du projet (et demandeur) ;
// - ajout comme membre, désignation comme responsable du projet ou d'un
//   livrable → la personne concernée ;
// - échéance d'un livrable à 7 jours → responsable du livrable, sinon du projet.
//
// Une notification n'échoue jamais l'action métier : erreurs journalisées.
@Injectable()
export class ProjetsNotificationsService {
  private readonly logger = new Logger(ProjetsNotificationsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  private async moduleId(): Promise<string | null> {
    const rows: Array<{ id: string }> = await this.dataSource.query("select id from modules where code = 'projets'");
    return rows[0]?.id ?? null;
  }

  // Envoie la même notification à plusieurs personnes, sans doublon et sans
  // notifier l'auteur de l'action.
  async notifier(
    destinataires: Array<string | null | undefined>,
    data: { titre: string; message?: string | null; projetId: string; onglet?: string; auteurId?: string | null },
  ): Promise<void> {
    try {
      const ids = [...new Set(destinataires.filter((d): d is string => !!d && d !== data.auteurId))];
      if (ids.length === 0) return;
      const moduleId = await this.moduleId();
      for (const destinataireId of ids) {
        await this.notifications.notifier(null, {
          destinataireId,
          moduleId,
          titre: data.titre,
          message: data.message ?? null,
          objetModule: 'projets',
          objetId: data.projetId,
          lienUrl: `/projets/${data.projetId}${data.onglet ? `?onglet=${data.onglet}` : ''}`,
        });
      }
    } catch (err) {
      this.logger.error(`Notification projet non envoyée : ${(err as Error).message}`);
    }
  }

  // Responsable de l'entité porteuse, ou du premier parent qui en a un.
  async validateurCloture(entiteId: string): Promise<string | null> {
    const rows: Array<{ responsable: string | null }> = await this.dataSource.query(
      `with recursive chaine as (
         select e.id, e.parent_entite_id, e.responsable_utilisateur_id, 0 as niveau from entites e where e.id = $1
         union all
         select p.id, p.parent_entite_id, p.responsable_utilisateur_id, c.niveau + 1
         from entites p join chaine c on p.id = c.parent_entite_id
         where c.niveau < 20
       )
       select responsable_utilisateur_id as responsable from chaine
       where responsable_utilisateur_id is not null order by niveau limit 1`,
      [entiteId],
    );
    return rows[0]?.responsable ?? null;
  }

  async nomUtilisateur(id: string | null | undefined): Promise<string> {
    if (!id) return '';
    const rows: Array<{ nom: string }> = await this.dataSource.query(
      `select prenom || ' ' || nom as nom from utilisateurs where id = $1`,
      [id],
    );
    return rows[0]?.nom ?? '';
  }

  // Échéance des livrables à 7 jours : un passage quotidien à 7 h. Idempotent :
  // une seule notification « Échéance » par livrable et par destinataire.
  @Cron('0 7 * * *')
  async notifierEcheancesLivrables(): Promise<number> {
    const livrables: Array<{
      id: string;
      nom: string;
      date_prevue: string;
      projet_id: string;
      code: string;
      destinataire: string | null;
    }> = await this.dataSource.query(
      `select l.id, l.nom, to_char(l.date_prevue, 'DD/MM/YYYY') as date_prevue, p.id as projet_id, p.code,
              coalesce(l.responsable_utilisateur_id, p.responsable_id) as destinataire
       from livrables l
       join projets p on p.id = l.projet_id
       left join valeurs_listes vl on vl.id = l.statut_valeur_id
       where p.cloture_statut is distinct from 'confirmee'
         and l.date_prevue = current_date + 7
         and coalesce(vl.code, '') not in ('realise', 'valide', 'annule')`,
    );
    let n = 0;
    for (const l of livrables) {
      if (!l.destinataire) continue;
      const titre = `Échéance dans 7 jours : ${l.nom} (${l.code})`;
      const deja: unknown[] = await this.dataSource.query(
        'select 1 from notifications where destinataire_id = $1 and objet_id = $2 and titre = $3 limit 1',
        [l.destinataire, l.projet_id, titre],
      );
      if (deja.length > 0) continue;
      await this.notifier([l.destinataire], {
        titre,
        message: `Le livrable « ${l.nom} » est attendu le ${l.date_prevue}.`,
        projetId: l.projet_id,
        onglet: 'livrables',
      });
      n++;
    }
    if (n > 0) this.logger.log(`${n} rappel(s) d'échéance de livrable envoyé(s)`);
    return n;
  }
}
