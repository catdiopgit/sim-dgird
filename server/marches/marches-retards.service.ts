import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';

interface PhaseEnRetard {
  phase_id: string;
  phase_nom: string;
  marche_id: string;
  marche_reference: string;
  entite_id: string | null;
  responsable_id: string | null;
  date_fin_prevue: string;
}

// §14 : alertes par e-mail sur les phases de marché. Même patron que le
// second bloc de RetardsService (boucle courrier_destinataires.echeance) : une
// échéance métier explicite (phases_marche.date_fin_prevue) comparée à
// aujourd'hui, indépendante du moteur de workflow générique — les marchés ne
// passent pas par workflow_instances. Idempotent : une notification "Retard :"
// par phase et par jour (même garde-fou que RetardsService.dejaNotifieAujourdhui).
// EmailNotificationsService envoie ensuite le mail sans aucune modification :
// il traite toute ligne `notifications` non envoyée, quel que soit son
// objet_module.
@Injectable()
export class MarchesRetardsService {
  private readonly logger = new Logger(MarchesRetardsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async detecterEtNotifierRetardsCron(): Promise<void> {
    const total = await this.detecterEtNotifierRetards();
    if (total > 0) this.logger.log(`${total} notification(s) de retard de phase de marché envoyée(s)`);
  }

  async detecterEtNotifierRetards(): Promise<number> {
    let nbNotifiees = 0;
    const moduleId = await this.moduleId('marches');

    const phases: PhaseEnRetard[] = await this.dataSource.query(
      `select p.id as phase_id, p.nom as phase_nom, m.id as marche_id, m.reference as marche_reference,
              m.entite_id, m.responsable_id, p.date_fin_prevue
       from phases_marche p
       join marches m on m.id = p.marche_id
       where p.date_fin_reelle is null
         and p.date_fin_prevue is not null
         and p.date_fin_prevue < current_date
         and m.statut_cloture = 'en_cours'`,
    );

    for (const phase of phases) {
      const dejaNotifie = await this.dejaNotifieAujourdhui(phase.phase_id);
      if (dejaNotifie) continue;
      // objet_id pointe la phase elle-même (pas le marché) : chaque phase a
      // sa propre échéance et sa propre notification.

      const joursRetard = await this.dataSource
        .query('select (current_date - $1::date) as jours', [phase.date_fin_prevue])
        .then((rows) => Number(rows[0]?.jours ?? 0));

      const destinataires = new Set<string>();
      if (phase.responsable_id) destinataires.add(phase.responsable_id);
      if (phase.entite_id) {
        const superieurId = await this.responsableParentEntite(phase.entite_id);
        if (superieurId) destinataires.add(superieurId);
        else {
          const responsableEntite = await this.responsableEntite(phase.entite_id);
          if (responsableEntite) destinataires.add(responsableEntite);
        }
      }

      for (const destinataireId of destinataires) {
        await this.notifications.notifier(null, {
          destinataireId,
          moduleId,
          titre: `Retard : ${phase.phase_nom}`,
          message: `Marché ${phase.marche_reference} — phase en retard de ${joursRetard} jour(s).`,
          objetModule: 'marches',
          objetId: phase.phase_id,
        });
        nbNotifiees++;
      }
    }

    return nbNotifiees;
  }

  private async dejaNotifieAujourdhui(phaseId: string): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `select 1 from notifications
       where objet_module = 'marches' and objet_id = $1 and titre like 'Retard :%' and created_at::date = current_date`,
      [phaseId],
    );
    return rows.length > 0;
  }

  private async responsableParentEntite(entiteId: string): Promise<string | null> {
    const rows: Array<{ responsable_utilisateur_id: string | null }> = await this.dataSource.query(
      `select parent.responsable_utilisateur_id
       from entites e
       join entites parent on parent.id = e.parent_entite_id
       where e.id = $1`,
      [entiteId],
    );
    return rows[0]?.responsable_utilisateur_id ?? null;
  }

  private async responsableEntite(entiteId: string): Promise<string | null> {
    const rows: Array<{ responsable_utilisateur_id: string | null }> = await this.dataSource.query(
      'select responsable_utilisateur_id from entites where id = $1',
      [entiteId],
    );
    return rows[0]?.responsable_utilisateur_id ?? null;
  }

  private async moduleId(code: string): Promise<string | null> {
    const rows: Array<{ id: string }> = await this.dataSource.query('select id from modules where code = $1', [code]);
    return rows[0]?.id ?? null;
  }
}
