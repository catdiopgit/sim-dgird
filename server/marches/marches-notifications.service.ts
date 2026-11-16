import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { MarchesAccesService } from './acces/marches-acces.service';

// Recette 2026-11 — notifications du module Marchés (e-mail dès que le SMTP de
// l'organisation est configuré, via EmailNotificationsService) :
// - désignation comme responsable d'un marché, attribution, clôture ;
// - échéance d'une phase à 7 jours → responsable du marché ;
// - retard d'une phase → responsable du marché et directeur de l'entité
//   porteuse, relancé une fois par semaine (au lieu de chaque jour) ;
// - récapitulatif quotidien (jours ouvrés, 7 h 30) → chaque membre de la
//   cellule de passation des marchés.
// Une notification n'échoue jamais l'action métier : erreurs journalisées.
@Injectable()
export class MarchesNotificationsService {
  private readonly logger = new Logger(MarchesNotificationsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly acces: MarchesAccesService,
  ) {}

  private async moduleId(): Promise<string | null> {
    const rows: Array<{ id: string }> = await this.dataSource.query("select id from modules where code = 'marches'");
    return rows[0]?.id ?? null;
  }

  async notifier(
    destinataires: Array<string | null | undefined>,
    data: { titre: string; message?: string | null; marcheId: string; onglet?: string; auteurId?: string | null },
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
          objetModule: 'marches',
          objetId: data.marcheId,
          lienUrl: `/marches/${data.marcheId}${data.onglet ? `?onglet=${data.onglet}` : ''}`,
        });
      }
    } catch (err) {
      this.logger.error(`Notification marché non envoyée : ${(err as Error).message}`);
    }
  }

  async membresCellule(organisationId: string): Promise<string[]> {
    return this.acces.membresCellule(organisationId);
  }

  private async dejaNotifie(destinataireId: string, marcheId: string, titre: string, jours: number): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `select 1 from notifications
       where destinataire_id = $1 and objet_id = $2 and titre = $3
         and created_at >= current_date - make_interval(days => $4::int) limit 1`,
      [destinataireId, marcheId, titre, jours],
    );
    return rows.length > 0;
  }

  // Retards (relance hebdomadaire) et échéances à 7 jours : passage quotidien.
  @Cron('0 7 * * *')
  async alertesPhases(): Promise<number> {
    let n = 0;
    const phases: Array<{
      phase_nom: string;
      ordre: number;
      phase_responsable: string | null;
      marche_id: string;
      reference: string;
      responsable_id: string | null;
      directeur_id: string | null;
      date_fin: string;
      jours: number;
    }> = await this.dataSource.query(
      `select p.nom as phase_nom, p.ordre, p.responsable as phase_responsable, m.id as marche_id, m.reference, m.responsable_id,
              e.responsable_utilisateur_id as directeur_id,
              to_char(p.date_fin_prevue, 'DD/MM/YYYY') as date_fin,
              (p.date_fin_prevue - current_date)::int as jours
       from phases_marche p
       join marches m on m.id = p.marche_id and m.statut_cloture = 'en_cours'
       left join entites e on e.id = m.entite_id
       where p.date_fin_reelle is null and p.date_fin_prevue is not null
         and (p.date_fin_prevue < current_date or p.date_fin_prevue = current_date + 7)`,
    );
    for (const p of phases) {
      if (p.jours === 7) {
        const titre = `Échéance dans 7 jours : ${p.phase_nom} (${p.reference})`;
        if (p.responsable_id && !(await this.dejaNotifie(p.responsable_id, p.marche_id, titre, 30))) {
          await this.notifier([p.responsable_id], {
            titre,
            message: `La phase ${p.ordre} « ${p.phase_nom} »${p.phase_responsable ? ` (${p.phase_responsable})` : ''} doit être terminée le ${p.date_fin}.`,
            marcheId: p.marche_id,
            onglet: 'phases',
          });
          n++;
        }
        continue;
      }
      const titre = `Retard : ${p.phase_nom} (${p.reference})`;
      for (const dest of new Set([p.responsable_id, p.directeur_id].filter((d): d is string => !!d))) {
        if (await this.dejaNotifie(dest, p.marche_id, titre, 7)) continue;
        await this.notifier([dest], {
          titre,
          message: `Marché ${p.reference} — la phase ${p.ordre} « ${p.phase_nom} »${p.phase_responsable ? ` (${p.phase_responsable})` : ''} devait être terminée le ${p.date_fin} (${-p.jours} jour(s) de retard).`,
          marcheId: p.marche_id,
          onglet: 'phases',
        });
        n++;
      }
    }
    if (n > 0) this.logger.log(`${n} alerte(s) de phase de marché envoyée(s)`);
    return n;
  }

  // Récapitulatif quotidien de la cellule de passation des marchés (lun.-ven.).
  @Cron('30 7 * * 1-5')
  async recapitulatifQuotidien(): Promise<number> {
    let n = 0;
    const organisations: Array<{ id: string }> = await this.dataSource.query('select id from organisations');
    for (const o of organisations) {
      const membres = await this.membresCellule(o.id);
      if (membres.length === 0) continue;
      const message = await this.composerRecapitulatif(o.id);
      const titre = `Marchés — situation du ${new Date().toLocaleDateString('fr-FR')}`;
      const moduleId = await this.moduleId();
      for (const destinataireId of membres) {
        const deja: unknown[] = await this.dataSource.query(
          `select 1 from notifications where destinataire_id = $1 and titre = $2 limit 1`,
          [destinataireId, titre],
        );
        if (deja.length > 0) continue;
        await this.notifications.notifier(null, {
          destinataireId,
          moduleId,
          titre,
          message,
          objetModule: 'marches',
          lienUrl: '/marches',
        });
        n++;
      }
    }
    if (n > 0) this.logger.log(`Récapitulatif marchés envoyé à ${n} membre(s) de la cellule`);
    return n;
  }

  async composerRecapitulatif(organisationId: string): Promise<string> {
    const enCours: Array<{ n: number }> = await this.dataSource.query(
      "select count(*)::int as n from marches where organisation_id = $1 and statut_cloture = 'en_cours'",
      [organisationId],
    );
    const retards: Array<{ reference: string; phase: string; responsable: string | null; jours: number }> = await this.dataSource.query(
      `select m.reference, p.nom as phase, p.responsable, (current_date - p.date_fin_prevue)::int as jours
       from phases_marche p join marches m on m.id = p.marche_id
       where m.organisation_id = $1 and m.statut_cloture = 'en_cours'
         and p.date_fin_reelle is null and p.date_fin_prevue < current_date
       order by jours desc, m.reference`,
      [organisationId],
    );
    const echeances: Array<{ reference: string; phase: string; responsable: string | null; date: string }> = await this.dataSource.query(
      `select m.reference, p.nom as phase, p.responsable, to_char(p.date_fin_prevue, 'DD/MM/YYYY') as date
       from phases_marche p join marches m on m.id = p.marche_id
       where m.organisation_id = $1 and m.statut_cloture = 'en_cours'
         and p.date_fin_reelle is null and p.date_fin_prevue between current_date and current_date + 7
       order by p.date_fin_prevue, m.reference`,
      [organisationId],
    );
    const aCloturer: Array<{ reference: string }> = await this.dataSource.query(
      `select m.reference from marches m
       where m.organisation_id = $1 and m.statut_cloture = 'en_cours'
         and exists (select 1 from phases_marche p where p.marche_id = m.id)
         and not exists (select 1 from phases_marche p where p.marche_id = m.id and p.obligatoire and p.date_fin_reelle is null)
       order by m.reference`,
      [organisationId],
    );
    const depassements: Array<{ reference: string; ecart: string }> = await this.dataSource.query(
      `select m.reference, to_char(a.montant_attribue - m.montant_estimatif, 'FM999G999G999G990') as ecart
       from marches m join marche_attributions a on a.marche_id = m.id
       where m.organisation_id = $1 and m.statut_cloture = 'en_cours'
         and m.montant_estimatif is not null and a.montant_attribue > m.montant_estimatif
       order by m.reference`,
      [organisationId],
    );

    const lignes: string[] = [`Marchés en cours : ${enCours[0]?.n ?? 0}`, ''];
    lignes.push(`Phases en retard : ${retards.length}`);
    for (const r of retards.slice(0, 30)) lignes.push(`  - ${r.reference} — ${r.phase}${r.responsable ? ` [${r.responsable}]` : ''} (${r.jours} j de retard)`);
    lignes.push('', `Phases à terminer dans les 7 jours : ${echeances.length}`);
    for (const e of echeances.slice(0, 30)) lignes.push(`  - ${e.reference} — ${e.phase}${e.responsable ? ` [${e.responsable}]` : ''} (le ${e.date})`);
    lignes.push('', `Marchés prêts à clôturer (phases obligatoires réalisées) : ${aCloturer.length}`);
    for (const c of aCloturer.slice(0, 30)) lignes.push(`  - ${c.reference}`);
    if (depassements.length > 0) {
      lignes.push('', `Attributions au-dessus du montant estimatif : ${depassements.length}`);
      for (const d of depassements.slice(0, 30)) lignes.push(`  - ${d.reference} (+${d.ecart} FCFA)`);
    }
    return lignes.join('\n');
  }
}
