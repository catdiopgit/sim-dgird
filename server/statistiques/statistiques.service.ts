import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CourriersService } from '../courrier/courriers.service';
import { MarchesService } from '../marches/marches.service';
import { MissionsService } from '../missions/missions.service';
import { ProjetsService } from '../projets/projets.service';

// Statistiques et tableau de bord (v8.3) : remplace les anciennes RPC Supabase
// (fn_statistiques_*). Chaque calcul part de la liste des objets VISIBLES par
// l'utilisateur (mêmes règles que les listes), puis agrège en SQL.

export interface FiltresPeriode {
  dateDebut?: string;
  dateFin?: string;
}
export interface FiltresProjets extends FiltresPeriode {
  statutValeurId?: string;
  responsableId?: string;
  organismeExecutionType?: string;
}
export interface FiltresMissions extends FiltresPeriode {
  entiteId?: string;
  responsableId?: string;
  etapeCode?: string;
}
export interface Echeance {
  type: 'livrable' | 'action_mission' | 'courrier' | 'phase_marche';
  id: string;
  libelle: string;
  reference: string;
  dateEcheance: string;
  enRetard: boolean;
  lienId: string;
}
interface LigneEcheance {
  type: Echeance['type'];
  id: string;
  libelle: string;
  reference: string;
  date_echeance: Date | string;
  lien_id: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dateOuNull = (v?: string): string | null => (v && DATE.test(v) ? v : null);

@Injectable()
export class StatistiquesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly courriersService: CourriersService,
    private readonly projetsService: ProjetsService,
    private readonly missionsService: MissionsService,
    private readonly marchesService: MarchesService,
  ) {}

  async courrier(filtres: FiltresPeriode, user: AuthenticatedUser): Promise<unknown> {
    const visibles = await this.courriersService.findAll(user);
    const ids = visibles.filter((c) => !c.annuleLe).map((c) => c.id);
    const rows: Array<{ r: unknown }> = await this.dataSource.query(`with cv as (
     select c.* from courriers c
     where c.id = any($1::uuid[])
       and ($2::date is null or c.date_courrier >= $2::date)
       and ($3::date is null or c.date_courrier <= $3::date)
       ),
       etat as (
     select cv.id, wi.statut_instance,
            (wi.statut_instance = 'en_cours' and (
               (we.delai_jours is not null and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now())
               or exists (select 1 from courrier_destinataires cd
                          where cd.courrier_id = cv.id and cd.type_diffusion = 'principal'
                            and cd.echeance is not null and cd.echeance < current_date)
             )) as en_retard
     from cv
     left join workflow_instances wi on wi.id = cv.workflow_instance_id
     left join workflow_etapes we on we.id = wi.etape_courante_id
       )
       select jsonb_build_object(
     'totaux', (select jsonb_build_object(
         'total', count(*),
         'entrant', count(*) filter (where sens = 'entrant'),
         'sortant', count(*) filter (where sens = 'sortant'),
         'interne', count(*) filter (where sens = 'interne')) from cv),
     'parEtat', (select jsonb_build_object(
         'enCours', count(*) filter (where statut_instance = 'en_cours' and not en_retard),
         'enRetard', count(*) filter (where en_retard),
         'clotures', count(*) filter (where statut_instance = 'terminee')) from etat),
     'parEntite', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'libelle', coalesce(e.sigle, e.libelle), 'total', t.total) order by t.total desc), '[]'::jsonb)
         from (select entite_id, count(*) as total from cv where entite_id is not null group by entite_id) t
         join entites e on e.id = t.entite_id),
     'parType', (select coalesce(jsonb_agg(jsonb_build_object('id', vl.id, 'libelle', vl.libelle, 'total', t.total) order by t.total desc), '[]'::jsonb)
         from (select type_valeur_id, count(*) as total from cv where type_valeur_id is not null group by type_valeur_id) t
         join valeurs_listes vl on vl.id = t.type_valeur_id),
     'parPriorite', (select coalesce(jsonb_agg(jsonb_build_object('id', vl.id, 'libelle', vl.libelle, 'total', t.total) order by t.total desc), '[]'::jsonb)
         from (select priorite_valeur_id, count(*) as total from cv where priorite_valeur_id is not null group by priorite_valeur_id) t
         join valeurs_listes vl on vl.id = t.priorite_valeur_id),
     'delaiMoyenJours', (select round(avg(extract(epoch from (wi.termine_le - cv.created_at)) / 86400)::numeric, 1)
         from cv join workflow_instances wi on wi.id = cv.workflow_instance_id where wi.termine_le is not null),
     'evolution', (select coalesce(jsonb_agg(jsonb_build_object('date', jour, 'total', total) order by jour), '[]'::jsonb)
         from (select date_courrier::date as jour, count(*) as total from cv where date_courrier is not null group by 1) t)
       ) as r`, [ids, dateOuNull(filtres.dateDebut), dateOuNull(filtres.dateFin)]);
    return rows[0]?.r;
    }
  async projets(filtres: FiltresProjets, user: AuthenticatedUser): Promise<unknown> {
    const ids = (await this.projetsService.findAll(user)).map((p) => p.id);
    const rows: Array<{ r: unknown }> = await this.dataSource.query(`with pv as (
     select p.* from projets p
     where p.id = any($1::uuid[])
       and ($2::date is null or p.date_debut >= $2::date)
       and ($3::date is null or p.date_debut <= $3::date)
       and ($4::uuid is null or p.statut_valeur_id = $4::uuid)
       and ($5::uuid is null or p.responsable_id = $5::uuid)
       and ($6::text is null or p.organisme_execution_type::text = $6::text)
       ),
       av as (select a.projet_id, a.montant from avenants a where a.projet_id in (select id from pv)),
       de as (select d.projet_id, d.montant from decaissements d where d.projet_id in (select id from pv)),
       li as (select l.projet_id, l.statut_valeur_id, l.date_prevue from livrables l where l.projet_id in (select id from pv)),
       -- Évolution A : retard calculé (même règle que projetEnRetard côté
       -- interface) — échéance dépassée sans clôture, ou statut « en-retard ».
       pr as (
         select pv.*, vl.code as statut_code,
                (pv.cloture_statut is distinct from 'confirmee' and (
                   vl.code = 'en-retard'
                   or (pv.date_fin_prevue < current_date
                       and coalesce(vl.code, '') not in ('termine', 'suspendu', 'annule'))
                 )) as en_retard
         from pv left join valeurs_listes vl on vl.id = pv.statut_valeur_id
       )
       select jsonb_build_object(
         'totaux', (select jsonb_build_object(
             'total', count(*),
             'enCours', count(*) filter (where statut_code = 'en-cours' and not en_retard),
             'aVenir', count(*) filter (where statut_code in ('a-faire', 'planifie') and not en_retard),
             'enRetard', count(*) filter (where en_retard),
             'clotures', count(*) filter (where cloture_statut = 'confirmee'))
           from pr),
     'avancementMoyen', (select round(avg(avancement_pct)::numeric, 1) from pv),
     'parEtat', (select coalesce(jsonb_agg(jsonb_build_object('id', vl.id, 'libelle', vl.libelle, 'couleur', vl.couleur, 'total', t.total) order by t.total desc), '[]'::jsonb)
         from (select statut_valeur_id, count(*) as total from pv where statut_valeur_id is not null group by statut_valeur_id) t
         join valeurs_listes vl on vl.id = t.statut_valeur_id),
     'parOrganisme', (select coalesce(jsonb_agg(jsonb_build_object('cle', organisme_execution_type, 'total', total) order by total desc), '[]'::jsonb)
         from (select organisme_execution_type, count(*) as total from pv group by organisme_execution_type) t),
     'parResponsable', (select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'libelle', u.prenom || ' ' || u.nom, 'total', t.total) order by t.total desc), '[]'::jsonb)
         from (select responsable_id, count(*) as total from pv where responsable_id is not null group by responsable_id) t
         join utilisateurs u on u.id = t.responsable_id),
     'financier', (select jsonb_build_object(
         'montantProjets', coalesce(sp.total, 0),
         'montantAvenants', coalesce(sa.total, 0),
         'montantContractuel', coalesce(sp.total, 0) + coalesce(sa.total, 0),
         'montantDecaisse', coalesce(sd.total, 0),
         'pourcentageDecaisse', case when coalesce(sp.total, 0) + coalesce(sa.total, 0) > 0
           then round(coalesce(sd.total, 0) / (coalesce(sp.total, 0) + coalesce(sa.total, 0)) * 100, 2) else 0 end,
         'resteADecaisser', coalesce(sp.total, 0) + coalesce(sa.total, 0) - coalesce(sd.total, 0))
       from (select sum(budget_prevu) as total from pv) sp, (select sum(montant) as total from av) sa,
            (select sum(montant) as total from de) sd),
     'livrables', (select jsonb_build_object(
         'total', count(*),
         'realises', count(*) filter (where vl.code in ('realise', 'valide')),
         'enCoursOuNonRealises', count(*) filter (where vl.code is null or vl.code not in ('realise', 'valide')),
         'enRetard', count(*) filter (where vl.code = 'en-retard'
           or (li.date_prevue < current_date and coalesce(vl.code, '') not in ('realise', 'valide', 'annule'))),
         'tauxRealisation', case when count(*) > 0
           then round(count(*) filter (where vl.code in ('realise', 'valide'))::numeric / count(*) * 100, 1) else 0 end)
       from li left join valeurs_listes vl on vl.id = li.statut_valeur_id),
     'evolution', (select coalesce(jsonb_agg(jsonb_build_object('date', jour, 'total', total) order by jour), '[]'::jsonb)
         from (select date_debut::date as jour, count(*) as total from pv where date_debut is not null group by 1) t)
       ) as r`, [
        ids,
        dateOuNull(filtres.dateDebut),
        dateOuNull(filtres.dateFin),
        filtres.statutValeurId || null,
        filtres.responsableId || null,
        filtres.organismeExecutionType || null,
    ]);
    return rows[0]?.r;
    }
  async missions(filtres: FiltresMissions, user: AuthenticatedUser): Promise<unknown> {
    const ids = (await this.missionsService.findAll(user)).map((m) => m.id);
    const rows: Array<{ r: unknown }> = await this.dataSource.query(`with mv as (
     select m.* from missions m
     where m.id = any($1::uuid[])
       and ($2::date is null or m.date_depart >= $2::date)
       and ($3::date is null or m.date_depart <= $3::date)
       and ($4::uuid is null or m.entite_id = $4::uuid)
       and ($5::uuid is null or m.responsable_id = $5::uuid)
       and ($6::text is null or m.etape_code = $6::text)
       ),
       mp as (select p.mission_id from mission_participants p where p.mission_id in (select id from mv))
       select jsonb_build_object(
     'totaux', (select jsonb_build_object(
         'total', count(*),
         'enCours', count(*) filter (where etape_code = 'en-cours'),
         'aVenir', count(*) filter (where date_depart > current_date),
         'enRetard', count(*) filter (where date_retour < current_date and etape_code is distinct from 'cloture'),
         'clotures', count(*) filter (where etape_code = 'cloture')) from mv),
     'dureeMoyenneJours', (select round(avg(date_retour - date_depart)::numeric, 1) from mv),
     'parEtape', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'libelle', libelle, 'total', total) order by ordre), '[]'::jsonb)
         from (select mv.etape_code as code, coalesce(mv.etape_libelle, mv.etape_code) as libelle, count(*) as total,
                      min(coalesce(we.ordre, 0)) as ordre
               from mv
               left join workflow_instances wi on wi.id = mv.workflow_instance_id
               left join workflow_etapes we on we.workflow_definition_id = wi.workflow_definition_id and we.code = mv.etape_code
               where mv.etape_code is not null
               group by mv.etape_code, mv.etape_libelle) t),
     'parEntite', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'libelle', coalesce(e.sigle, e.libelle), 'total', t.total) order by t.total desc), '[]'::jsonb)
         from (select entite_id, count(*) as total from mv group by entite_id) t join entites e on e.id = t.entite_id),
     'parResponsable', (select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'libelle', u.prenom || ' ' || u.nom, 'total', t.total) order by t.total desc), '[]'::jsonb)
         from (select responsable_id, count(*) as total from mv where responsable_id is not null group by responsable_id) t
         join utilisateurs u on u.id = t.responsable_id),
     'financier', (select jsonb_build_object(
         'budgetPrevu', coalesce(sum(budget_prevu), 0),
         'budgetReel', coalesce(sum(budget_reel), 0),
         'ecart', coalesce(sum(budget_reel), 0) - coalesce(sum(budget_prevu), 0),
         'pourcentageRealise', case when coalesce(sum(budget_prevu), 0) > 0
           then round(coalesce(sum(budget_reel), 0) / sum(budget_prevu) * 100, 2) else 0 end) from mv),
     'participants', (select jsonb_build_object(
         'total', count(*),
         'moyenneParMission', case when (select count(*) from mv) > 0
           then round(count(*)::numeric / (select count(*) from mv), 1) else 0 end) from mp),
     'evolution', (select coalesce(jsonb_agg(jsonb_build_object('date', jour, 'total', total) order by jour), '[]'::jsonb)
         from (select date_depart::date as jour, count(*) as total from mv where date_depart is not null group by 1) t)
       ) as r`, [
        ids,
        dateOuNull(filtres.dateDebut),
        dateOuNull(filtres.dateFin),
        filtres.entiteId || null,
        filtres.responsableId || null,
        filtres.etapeCode || null,
    ]);
    return rows[0]?.r;
    }
  async echeances(horizonJours: number, user: AuthenticatedUser): Promise<Echeance[]> {
    const horizon = Number.isFinite(horizonJours) && horizonJours > 0 ? Math.min(horizonJours, 365) : 30;
    const [projets, missions, courriers, marches] = await Promise.all([
        this.projetsService.findAll(user),
        this.missionsService.findAll(user),
        this.courriersService.findAll(user),
        this.marchesService.findAll(user),
    ]);
    const rows: LigneEcheance[] = await this.dataSource.query(`select * from (
     select 'livrable' as type, l.id, l.nom as libelle, p.nom as reference, l.date_prevue as date_echeance, p.id as lien_id
     from livrables l
     join projets p on p.id = l.projet_id
     left join valeurs_listes vl on vl.id = l.statut_valeur_id
     where p.id = any($1::uuid[]) and l.date_prevue is not null
       and coalesce(vl.code, '') not in ('realise', 'valide', 'annule')
       and l.date_prevue <= current_date + make_interval(days => $4::int)
     union all
     select 'action_mission', mas.id, mas.description, m.reference, mas.date_echeance, m.id
     from mission_actions_suivi mas
     join missions m on m.id = mas.mission_id
     left join valeurs_listes vl on vl.id = mas.statut_valeur_id
     where m.id = any($2::uuid[]) and mas.date_echeance is not null
       and coalesce(vl.code, '') not in ('realise', 'valide', 'termine')
       and mas.date_echeance <= current_date + make_interval(days => $4::int)
     union all
     select 'courrier', c.id, c.objet, coalesce(c.numero, ''), min(cd.echeance), c.id
     from courriers c
     join workflow_instances wi on wi.id = c.workflow_instance_id and wi.statut_instance = 'en_cours'
     join courrier_destinataires cd on cd.courrier_id = c.id and cd.type_diffusion = 'principal' and cd.echeance is not null
     where c.id = any($3::uuid[]) and c.annule_le is null
       and cd.echeance <= current_date + make_interval(days => $4::int)
     group by c.id, c.objet, c.numero
     union all
     -- Évolution C (recette 2026-11) : phases de marché non terminées.
     select 'phase_marche', p.id, p.nom, m.reference, p.date_fin_prevue, m.id
     from phases_marche p
     join marches m on m.id = p.marche_id and m.statut_cloture = 'en_cours'
     where m.id = any($5::uuid[]) and p.date_fin_reelle is null and p.date_fin_prevue is not null
       and p.date_fin_prevue <= current_date + make_interval(days => $4::int)
   ) e order by date_echeance`, [projets.map((p) => p.id), missions.map((m) => m.id), courriers.map((c) => c.id), horizon, marches.map((m) => m.id)]);
    const aujourdhui = new Date().toISOString().slice(0, 10);
    return rows.map((r) => {
        const date = r.date_echeance instanceof Date ? r.date_echeance.toISOString().slice(0, 10) : String(r.date_echeance).slice(0, 10);
        return {
            type: r.type,
            id: r.id,
            libelle: r.libelle,
            reference: r.reference,
            dateEcheance: date,
            enRetard: date < aujourdhui,
            lienId: r.lien_id,
        };
    });
    }
}
