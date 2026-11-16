import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { WorkflowHistorique } from '../workflow/entities/workflow-historique.entity';
import { Courrier } from './entities/courrier.entity';
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
  porteeDiffusion?: 'responsable' | 'entite' | 'entite_et_descendants' | null;
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
    @InjectDataSource() private readonly dataSource: DataSource,
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

  // Recette 2026-11 (notes internes) : la prise de connaissance est faite par le
  // destinataire lui-même — la personne désignée, ou le responsable / la personne
  // réceptrice de l'entité destinataire — et non par qui peut modifier le courrier.
  async marquerPriseConnaissance(id: string, user: AuthenticatedUser): Promise<CourrierDestinataire> {
    const destinataire = await this.destinataires.findOneBy({ id });
    if (!destinataire) throw new NotFoundException('Destinataire introuvable');
    await this.courriersService.findOne(destinataire.courrierId, user); // 404 si non visible
    if (!(await this.estConcerne(destinataire, user))) {
      throw new ForbiddenException("Vous n'êtes pas ce destinataire");
    }
    if (!destinataire.datePriseConnaissance) {
      await this.destinataires.update(id, { datePriseConnaissance: new Date() });
      await this.cloturerSiToutLu(destinataire.courrierId, user);
    }
    return this.destinataires.findOneByOrFail({ id });
  }

  // Marque d'un coup toutes les lignes de destinataire qui concernent l'utilisateur.
  async priseConnaissanceCourrier(courrierId: string, user: AuthenticatedUser): Promise<{ marques: number }> {
    await this.courriersService.findOne(courrierId, user);
    const lignes = await this.destinataires.find({ where: { courrierId } });
    let marques = 0;
    for (const l of lignes) {
      if (!l.datePriseConnaissance && (await this.estConcerne(l, user))) {
        await this.destinataires.update(l.id, { datePriseConnaissance: new Date() });
        marques++;
      }
    }
    if (marques > 0) await this.cloturerSiToutLu(courrierId, user);
    return { marques };
  }

  private async estConcerne(d: CourrierDestinataire, user: AuthenticatedUser): Promise<boolean> {
    if (d.utilisateurId) return d.utilisateurId === user.id;
    if (!d.entiteId) return false;
    // Ligne d'entité diffusée au personnel : chaque agent a sa propre ligne
    // nominative ; la ligne d'entité elle-même ne se « lit » pas.
    if (d.porteeDiffusion && d.porteeDiffusion !== 'responsable') return false;
    const rows: unknown[] = await this.dataSource.query(
      'select 1 from entites where id = $1 and (responsable_utilisateur_id = $2 or personne_receptrice_id = $2) limit 1',
      [d.entiteId, user.id],
    );
    return rows.length > 0;
  }

  // Note interne diffusée : clôture automatique quand tous les destinataires internes
  // (personnes et entités) ont pris connaissance.
  private async cloturerSiToutLu(courrierId: string, user: AuthenticatedUser): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const infos: Array<{ wi: string; etape: string; code: string; sens: string }> = await manager.query(
        `select wi.id as wi, wi.etape_courante_id as etape, we.code, c.sens
         from courriers c join workflow_instances wi on wi.id = c.workflow_instance_id
         join workflow_etapes we on we.id = wi.etape_courante_id
         where c.id = $1 and wi.statut_instance = 'en_cours'`,
        [courrierId],
      );
      const i = infos[0];
      if (!i || i.sens !== 'interne' || i.code !== 'diffuse') return;
      // Diffusion au personnel : pas de clôture à la dernière lecture, la note
      // est clôturée à l'expiration du délai (cloturerNotesEchues).
      const masse: Array<{ n: number }> = await manager.query(
        `select count(*)::int as n from courrier_destinataires
         where courrier_id = $1 and portee_diffusion in ('entite', 'entite_et_descendants')`,
        [courrierId],
      );
      if ((masse[0]?.n ?? 0) > 0) return;
      const restants: Array<{ n: number }> = await manager.query(
        `select count(*)::int as n from courrier_destinataires
         where courrier_id = $1 and contact_id is null and date_prise_connaissance is null`,
        [courrierId],
      );
      if ((restants[0]?.n ?? 0) > 0) return;
      await this.cloturerNote(manager, courrierId, i.wi, i.etape, user.id, 'Tous les destinataires ont pris connaissance — note clôturée');
    });
  }

  private async cloturerNote(
    manager: EntityManager,
    courrierId: string,
    instanceId: string,
    etapeId: string,
    utilisateurId: string,
    commentaire: string,
  ): Promise<void> {
    const finales: Array<{ id: string; code: string; libelle: string }> = await manager.query(
      `select e.id, e.code, e.libelle from workflow_etapes e
       join workflow_instances wi on wi.workflow_definition_id = e.workflow_definition_id
       where wi.id = $1 and e.type_etape = 'finale' order by e.ordre limit 1`,
      [instanceId],
    );
    const finale = finales[0];
    if (!finale) return;
    await manager.query(
      `update workflow_instances set etape_courante_id = $2, etape_courante_depuis = now(),
              statut_instance = 'terminee', termine_le = now() where id = $1`,
      [instanceId, finale.id],
    );
    await manager.update(Courrier, courrierId, { etapeCode: finale.code, etapeLibelle: finale.libelle });
    await manager.save(
      WorkflowHistorique,
      manager.create(WorkflowHistorique, {
        workflowInstanceId: instanceId,
        transitionId: null,
        etapePrecedenteId: etapeId,
        etapeSuivanteId: finale.id,
        utilisateurId,
        commentaire,
      }),
    );
  }

  // Notes de service diffusées au personnel : clôture automatique après le
  // délai paramétré (parametres_organisation.notes_delai_cloture_jours, 15 j).
  @Cron(CronExpression.EVERY_HOUR)
  async cloturerNotesEchues(): Promise<void> {
    const notes: Array<{ id: string; wi: string; etape: string; diffuseur: string; jours: number }> = await this.dataSource.query(
      `select c.id, wi.id as wi, wi.etape_courante_id as etape,
              (select h.utilisateur_id from workflow_historique h where h.workflow_instance_id = wi.id
                and h.etape_suivante_id = wi.etape_courante_id order by h.created_at desc limit 1) as diffuseur,
              coalesce((select (p.valeur->>'jours')::int from parametres_organisation p
                        where p.organisation_id = c.organisation_id and p.cle = 'notes_delai_cloture_jours'), 15) as jours
       from courriers c
       join workflow_instances wi on wi.id = c.workflow_instance_id and wi.statut_instance = 'en_cours'
       join workflow_etapes we on we.id = wi.etape_courante_id and we.code = 'diffuse'
       where c.sens = 'interne' and c.annule_le is null
         and exists (select 1 from courrier_destinataires cd where cd.courrier_id = c.id
                     and cd.portee_diffusion in ('entite', 'entite_et_descendants'))`,
    );
    for (const n of notes) {
      const echue: Array<{ ok: boolean }> = await this.dataSource.query(
        `select (select etape_courante_depuis from workflow_instances where id = $1) < now() - make_interval(days => $2::int) as ok`,
        [n.wi, n.jours],
      );
      if (!echue[0]?.ok) continue;
      await this.dataSource.transaction((manager) =>
        this.cloturerNote(manager, n.id, n.wi, n.etape, n.diffuseur, `Délai de diffusion de ${n.jours} jours écoulé — note clôturée automatiquement`),
      );
    }
  }

  async listActionsDemandees(destinataireId: string, user: AuthenticatedUser): Promise<string[]> {
    const destinataire = await this.destinataires.findOneBy({ id: destinataireId });
    if (!destinataire) throw new NotFoundException('Destinataire introuvable');
    await this.courriersService.findOne(destinataire.courrierId, user); // 404 si non visible
    const rows = await this.actions.find({ where: { courrierDestinataireId: destinataireId } });
    return rows.map((r) => r.valeurListeId);
  }
}
