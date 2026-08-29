import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { NotificationsService } from './notifications.service';

interface InstanceEnRetard {
  instance_id: string;
  etape_courante_id: string;
  etape_libelle: string;
  delai_jours: number;
  etape_courante_depuis: Date;
}

interface EcheanceCourrierEnRetard {
  objet_id: string;
  entite_objet: string | null;
  etape_courante_id: string;
  etape_libelle: string;
  echeance: string;
}

// Portage de app.fn_detecter_et_notifier_retards (dernier corps 0059) : scan des
// workflow_instances dont l'étape courante dépasse son délai (`workflow_etapes.delai_jours`),
// notification des acteurs de l'étape (relance) + escalade au supérieur hiérarchique de
// l'entité porteuse, puis boucle séparée sur les échéances de courrier_destinataires
// (indépendante du délai d'étape, spécifique Courrier). Idempotent : une seule
// notification "Retard :" par objet et par jour (vérifié par requête, pas par contrainte
// SQL — fidèle à l'origine).
//
// Remplace l'Edge Function `detecter-retards-workflow` (cron horaire externe, déclenchée
// via le tableau de bord Supabase) : @nestjs/schedule internalise l'horloge, plus besoin
// d'un endpoint HTTP à appeler périodiquement depuis l'extérieur.
@Injectable()
export class RetardsService {
  private readonly logger = new Logger(RetardsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async detecterEtNotifierRetardsCron(): Promise<void> {
    const total = await this.detecterEtNotifierRetards();
    if (total > 0) this.logger.log(`${total} notification(s) de retard envoyée(s)`);
  }

  async detecterEtNotifierRetards(): Promise<number> {
    let nbNotifiees = 0;

    const instances: InstanceEnRetard[] = await this.dataSource.query(
      `select wi.id as instance_id, wi.etape_courante_id, we.libelle as etape_libelle, we.delai_jours,
              wi.etape_courante_depuis
       from workflow_instances wi
       join workflow_etapes we on we.id = wi.etape_courante_id
       where wi.statut_instance = 'en_cours'
         and we.delai_jours is not null
         and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now()`,
    );

    for (const instance of instances) {
      const objet = await this.resoudreObjetPorteur(instance.instance_id);
      if (!objet || objet.supprimeLe) continue;

      const dejaNotifie = await this.dejaNotifieAujourdhui(objet.module, objet.id);
      if (dejaNotifie) continue;

      const joursRetard = Math.floor(
        (Date.now() - new Date(instance.etape_courante_depuis).getTime()) / 86_400_000,
      );

      const moduleId = await this.moduleId(objet.module);
      const destinataires = await this.workflowEngine.resolveDestinatairesEtape(
        instance.etape_courante_id,
        objet.entiteId,
      );
      for (const destinataireId of destinataires) {
        await this.notifications.notifier(null, {
          destinataireId,
          moduleId,
          titre: `Retard : ${instance.etape_libelle}`,
          message: `En attente depuis ${joursRetard} jour(s), délai dépassé.`,
          objetModule: objet.module,
          objetId: objet.id,
        });
        nbNotifiees++;
      }

      if (objet.entiteId) {
        const superieurId = await this.responsableParentEntite(objet.entiteId);
        if (superieurId) {
          await this.notifications.notifier(null, {
            destinataireId: superieurId,
            moduleId,
            titre: `Retard : ${instance.etape_libelle}`,
            message: `Escalade — en attente depuis ${joursRetard} jour(s) sans action, délai dépassé.`,
            objetModule: objet.module,
            objetId: objet.id,
          });
          nbNotifiees++;
        }
      }
    }

    // Échéances de courrier_destinataires (imputation/affectation/transmission/
    // redirection) dépassées, indépendamment du délai statique de l'étape.
    const moduleCourrierId = await this.moduleId('courrier');
    const echeances: EcheanceCourrierEnRetard[] = await this.dataSource.query(
      `select c.id as objet_id, c.entite_id as entite_objet, wi.etape_courante_id, we.libelle as etape_libelle,
              cd.echeance
       from courrier_destinataires cd
       join courriers c on c.id = cd.courrier_id
       join workflow_instances wi on wi.id = c.workflow_instance_id
       join workflow_etapes we on we.id = wi.etape_courante_id
       where cd.type_diffusion = 'principal'
         and cd.echeance is not null
         and cd.echeance < current_date
         and wi.statut_instance = 'en_cours'
         and c.supprime_le is null`,
    );

    for (const echeance of echeances) {
      const dejaNotifie = await this.dejaNotifieAujourdhui('courrier', echeance.objet_id);
      if (dejaNotifie) continue;

      const joursRetard = Math.floor(
        (Date.now() - new Date(echeance.echeance).getTime()) / 86_400_000,
      );

      const destinataires = await this.workflowEngine.resolveDestinatairesEtape(
        echeance.etape_courante_id,
        echeance.entite_objet,
      );
      for (const destinataireId of destinataires) {
        await this.notifications.notifier(null, {
          destinataireId,
          moduleId: moduleCourrierId,
          titre: `Retard : ${echeance.etape_libelle}`,
          message: `Échéance dépassée depuis ${joursRetard} jour(s).`,
          objetModule: 'courrier',
          objetId: echeance.objet_id,
        });
        nbNotifiees++;
      }
    }

    return nbNotifiees;
  }

  private async resoudreObjetPorteur(
    instanceId: string,
  ): Promise<{ module: string; id: string; entiteId: string | null; supprimeLe: Date | null } | null> {
    const courrier: Array<{ id: string; entite_id: string | null; supprime_le: Date | null }> = await this.dataSource.query(
      'select id, entite_id, supprime_le from courriers where workflow_instance_id = $1',
      [instanceId],
    );
    if (courrier[0]) {
      return { module: 'courrier', id: courrier[0].id, entiteId: courrier[0].entite_id, supprimeLe: courrier[0].supprime_le };
    }

    const ged: Array<{ id: string; entite_id: string | null; supprime_le: Date | null }> = await this.dataSource.query(
      'select id, entite_id, supprime_le from ged_versements where workflow_instance_id = $1',
      [instanceId],
    );
    if (ged[0]) {
      return { module: 'ged', id: ged[0].id, entiteId: ged[0].entite_id, supprimeLe: ged[0].supprime_le };
    }

    const mission: Array<{ id: string; entite_id: string | null }> = await this.dataSource.query(
      'select id, entite_id from missions where workflow_instance_id = $1',
      [instanceId],
    );
    if (mission[0]) {
      return { module: 'missions', id: mission[0].id, entiteId: mission[0].entite_id, supprimeLe: null };
    }

    return null;
  }

  private async dejaNotifieAujourdhui(objetModule: string, objetId: string): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `select 1 from notifications
       where objet_module = $1 and objet_id = $2 and titre like 'Retard :%' and created_at::date = current_date`,
      [objetModule, objetId],
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

  private async moduleId(code: string): Promise<string | null> {
    const rows: Array<{ id: string }> = await this.dataSource.query('select id from modules where code = $1', [code]);
    return rows[0]?.id ?? null;
  }
}
