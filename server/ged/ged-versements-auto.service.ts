import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { getStorageRoot } from '../config/storage.config';
import { Document } from './entities/document.entity';
import { GedVersement } from './entities/ged-versement.entity';
import { GedAccesService } from './ged-acces.service';
import { GedStorageService } from './ged-storage.service';
import { GedVersementsService } from './ged-versements.service';

export type ModuleVerse = 'courrier' | 'projet' | 'marche';
const MODULES: ModuleVerse[] = ['courrier', 'projet', 'marche'];
const CLE_PARAMETRE = 'ged_versement_auto_annuel';

interface Element {
  type: ModuleVerse;
  id: string;
  reference: string;
  libelle: string;
  date: string;
  entiteId: string | null;
  sous: string;
  sousLibelle: string;
  nbDocuments: number;
}

export interface Ecarte {
  type: ModuleVerse;
  reference: string;
  libelle: string;
  motif: string;
}

export interface GroupeVersement {
  cle: string;
  type: ModuleVerse;
  titre: string;
  directionId: string | null;
  direction: string;
  regroupement: string;
  dossierCibleId: string | null;
  dossierCible: string | null;
  dateDebut: string;
  dateFin: string;
  nbElements: number;
  nbDocuments: number;
  elements: Element[];
}

const SENS: Record<string, string> = { entrant: 'arrivée', sortant: 'départ', interne: 'internes' };
const DOSSIER_SENS: Record<string, string> = { entrant: 'A-I-01', sortant: 'A-I-02', interne: 'A-I' };
const fr = (d: string) => d.split('-').reverse().join('/');
const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// v8.7 — versements automatiques : le SIM constitue les versements à partir
// des éléments clôturés des modules (courriers par direction et par sens,
// projets par direction et par projet, marchés par direction et par type),
// sur une période choisie (jamais l'année en cours). Les versements sont créés
// déjà soumis : l'archiviste les réceptionne, contrôle, classe et archive comme
// un versement ordinaire.
@Injectable()
export class GedVersementsAutoService {
  private readonly logger = new Logger(GedVersementsAutoService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(GedVersement) private readonly versements: Repository<GedVersement>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    private readonly acces: GedAccesService,
    private readonly storage: GedStorageService,
    private readonly versementsService: GedVersementsService,
  ) {}

  private async assertAutorise(user: AuthenticatedUser): Promise<void> {
    if (!(await this.acces.peutGererPlan(user.id))) {
      throw new ForbiddenException("Les versements automatiques sont réservés à l'archiviste et à l'administrateur");
    }
  }

  private controlerPeriode(debut: string, fin: string, modules: ModuleVerse[]): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin)) throw new BadRequestException('Période invalide');
    if (fin < debut) throw new BadRequestException('La date de fin précède la date de début');
    const limite = `${new Date().getFullYear() - 1}-12-31`;
    if (fin > limite) {
      throw new BadRequestException(`Les données de l'année en cours ne peuvent pas être versées : la date de fin doit être au plus le ${fr(limite)}`);
    }
    if (!modules.length || modules.some((m) => !MODULES.includes(m))) throw new BadRequestException('Choisissez au moins un module');
  }

  // ---------- Détection ----------

  async apercu(user: AuthenticatedUser, debut: string, fin: string, modules: ModuleVerse[]) {
    await this.assertAutorise(user);
    this.controlerPeriode(debut, fin, modules);
    return this.detecter(user.organisationId, debut, fin, modules);
  }

  private async detecter(org: string, debut: string, fin: string, modules: ModuleVerse[]) {
    const elements: Element[] = [];
    const ecartes: Ecarte[] = [];
    const dejaVerses = new Set<string>(
      ((await this.dataSource.query('select type_element, element_id from ged_versement_elements where organisation_id = $1', [org])) as Array<{ type_element: string; element_id: string }>).map(
        (r) => `${r.type_element}:${r.element_id}`,
      ),
    );
    const retenir = (e: Element, cloture: boolean, motifNonCloture: string) => {
      if (dejaVerses.has(`${e.type}:${e.id}`)) return; // déjà versé : ignoré silencieusement
      if (!cloture) return ecartes.push({ type: e.type, reference: e.reference, libelle: e.libelle, motif: motifNonCloture });
      if (e.nbDocuments === 0) return ecartes.push({ type: e.type, reference: e.reference, libelle: e.libelle, motif: 'Aucun document' });
      elements.push(e);
    };

    if (modules.includes('courrier')) {
      const rows: Array<{ id: string; numero: string; objet: string; sens: string; entite_id: string | null; d: string; cloture: boolean; annule: boolean; nb: number }> =
        await this.dataSource.query(
          `select c.id, c.numero, c.objet, c.sens::text as sens,
                  coalesce(c.entite_id, c.entite_destinataire_id, (select u.entite_id from utilisateurs u where u.id = coalesce(c.redacteur_id, c.created_by))) as entite_id,
                  to_char(coalesce(c.date_reception::date, c.date_envoi::date, c.date_courrier::date, c.created_at::date), 'YYYY-MM-DD') as d,
                  (c.etape_code = 'cloture') as cloture, (c.annule_le is not null) as annule,
                  (select count(*)::int from courrier_pieces_jointes p where p.courrier_id = c.id and p.storage_path is not null) as nb
             from courriers c
            where c.organisation_id = $1 and c.supprime_le is null
              and coalesce(c.date_reception::date, c.date_envoi::date, c.date_courrier::date, c.created_at::date) between $2 and $3
            order by 6`,
          [org, debut, fin],
        );
      for (const r of rows) {
        if (r.annule) continue;
        retenir(
          { type: 'courrier', id: r.id, reference: r.numero, libelle: r.objet, date: r.d, entiteId: r.entite_id, sous: r.sens, sousLibelle: SENS[r.sens] ?? r.sens, nbDocuments: r.nb },
          r.cloture,
          'Courrier non clôturé',
        );
      }
    }

    if (modules.includes('projet')) {
      const rows: Array<{ id: string; code: string; nom: string; entite_id: string; d: string; cloture: boolean; nb: number }> = await this.dataSource.query(
        `select p.id, p.code, p.nom, p.entite_id,
                to_char(coalesce(p.cloture_confirmee_le::date, p.date_fin_reelle, p.date_fin_prevue), 'YYYY-MM-DD') as d,
                (p.cloture_statut = 'confirmee') as cloture,
                (select count(*)::int from documents d where d.supprime_le is null and d.version_courante_id is not null and d.versement_id is null
                   and (d.projet_id = p.id or d.livrable_id in (select id from livrables where projet_id = p.id)
                        or d.avenant_id in (select id from avenants where projet_id = p.id)
                        or d.decaissement_id in (select id from decaissements where projet_id = p.id))) as nb
           from projets p
          where p.organisation_id = $1
            and coalesce(p.cloture_confirmee_le::date, p.date_fin_reelle, p.date_fin_prevue) between $2 and $3`,
        [org, debut, fin],
      );
      for (const r of rows) {
        retenir(
          { type: 'projet', id: r.id, reference: r.code, libelle: r.nom, date: r.d, entiteId: r.entite_id, sous: r.id, sousLibelle: r.nom, nbDocuments: r.nb },
          r.cloture,
          'Projet non clôturé (clôture non confirmée)',
        );
      }
    }

    if (modules.includes('marche')) {
      const rows: Array<{ id: string; reference: string; objet: string; entite_id: string; d: string; cloture: boolean; type_id: string; type_libelle: string; type_code: string; nb: number }> =
        await this.dataSource.query(
          `select m.id, m.reference, m.objet, m.entite_id,
                  to_char(coalesce(m.cloture_le::date, m.date_fin_prevue), 'YYYY-MM-DD') as d,
                  (m.statut_cloture = 'cloture') as cloture, t.id as type_id, t.libelle as type_libelle, t.code as type_code,
                  (select count(*)::int from documents d where d.supprime_le is null and d.version_courante_id is not null and d.versement_id is null
                     and (d.marche_id = m.id or d.phase_marche_id in (select id from phases_marche where marche_id = m.id)
                          or d.marche_candidat_id in (select id from marche_candidats where marche_id = m.id))) as nb
             from marches m join types_marche t on t.id = m.type_marche_id
            where m.organisation_id = $1
              and coalesce(m.cloture_le::date, m.date_fin_prevue) between $2 and $3`,
          [org, debut, fin],
        );
      for (const r of rows) {
        retenir(
          { type: 'marche', id: r.id, reference: r.reference, libelle: r.objet, date: r.d, entiteId: r.entite_id, sous: r.type_id, sousLibelle: `${r.type_libelle}|${r.type_code}`, nbDocuments: r.nb },
          r.cloture,
          'Marché non clôturé',
        );
      }
    }

    // Regroupement par direction
    const directions = new Map<string, { id: string; sigle: string | null; libelle: string }>(
      (await this.acces.directions(org)).map((d) => [d.id, d]),
    );
    const cacheDirection = new Map<string, string | null>();
    const groupes = new Map<string, GroupeVersement>();
    const periode = debut.slice(0, 4) === fin.slice(0, 4) && debut.endsWith('-01-01') && fin.endsWith('-12-31') ? debut.slice(0, 4) : `du ${fr(debut)} au ${fr(fin)}`;
    for (const e of elements) {
      const cleEnt = e.entiteId ?? '';
      if (!cacheDirection.has(cleEnt)) cacheDirection.set(cleEnt, await this.acces.directionDe(e.entiteId));
      const dirId = cacheDirection.get(cleEnt) ?? null;
      const dir = dirId ? directions.get(dirId) : undefined;
      const sigle = dir?.sigle ?? dir?.libelle ?? 'Sans direction';
      const cle = `${e.type}|${dirId}|${e.sous}`;
      let g = groupes.get(cle);
      if (!g) {
        const typeLibelle = e.type === 'marche' ? e.sousLibelle.split('|')[0] : e.sousLibelle;
        const titre =
          e.type === 'courrier'
            ? `Courriers ${typeLibelle} — ${sigle} — ${periode}`
            : e.type === 'projet'
              ? `Projet « ${e.libelle} » (${e.reference}) — ${sigle}`
              : `Marchés — ${typeLibelle} — ${sigle} — ${periode}`;
        const dossier = await this.dossierProche(org, e);
        g = {
          cle,
          type: e.type,
          titre,
          directionId: dirId,
          direction: dir ? (dir.sigle ? `${dir.sigle} — ${dir.libelle}` : dir.libelle) : 'Sans direction',
          regroupement: e.type === 'courrier' ? `Courriers ${typeLibelle}` : e.type === 'projet' ? e.reference : typeLibelle,
          dossierCibleId: dossier?.id ?? null,
          dossierCible: dossier ? `${dossier.code} — ${dossier.libelle}` : null,
          dateDebut: e.date,
          dateFin: e.date,
          nbElements: 0,
          nbDocuments: 0,
          elements: [],
        };
        groupes.set(cle, g);
      }
      g.elements.push(e);
      g.nbElements++;
      g.nbDocuments += e.nbDocuments;
      if (e.date < g.dateDebut) g.dateDebut = e.date;
      if (e.date > g.dateFin) g.dateFin = e.date;
    }
    const liste = [...groupes.values()].sort((a, b) => a.type.localeCompare(b.type) || a.direction.localeCompare(b.direction) || a.titre.localeCompare(b.titre));
    return {
      periode: { debut, fin },
      groupes: liste,
      ecartes,
      totaux: {
        versements: liste.length,
        elements: liste.reduce((s, g) => s + g.nbElements, 0),
        documents: liste.reduce((s, g) => s + g.nbDocuments, 0),
        ecartes: ecartes.length,
      },
    };
  }

  // Rubrique du plan de classement la plus proche ; l'archiviste confirme ou
  // corrige au classement.
  private async dossierProche(org: string, e: Element): Promise<{ id: string; code: string; libelle: string } | null> {
    const par = async (code: string) =>
      ((await this.dataSource.query(
        'select id, code, libelle from ged_dossiers where organisation_id = $1 and code = $2 and supprime_le is null and actif limit 1',
        [org, code],
      )) as Array<{ id: string; code: string; libelle: string }>)[0] ?? null;
    if (e.type === 'courrier') return par(DOSSIER_SENS[e.sous] ?? 'A-I');
    if (e.type === 'projet') {
      const t = sansAccents(e.libelle);
      if (/\bpont|ouvrage/.test(t)) return par('INFRA-I-02');
      if (/\bbac|debarcadere/.test(t)) return par('INFRA-II');
      if (/batiment/.test(t)) return par('INFRA-IV');
      if (/securite routiere|signalisation/.test(t)) return par('INFRA-V');
      if (/\betude/.test(t)) return par('E-II');
      return par('INFRA-III-02');
    }
    const [lib, code] = e.sousLibelle.split('|');
    const t = sansAccents(`${lib} ${code}`);
    const serie = /intellectuel|\bpi\b|\bami\b|^pi-/.test(t) ? 'PM-III' : /fourniture|service/.test(t) ? 'PM-II' : /travaux/.test(t) ? 'PM-I' : null;
    if (!serie) return par('PM');
    const rubriques: Array<{ id: string; code: string; libelle: string }> = await this.dataSource.query(
      `select d.id, d.code, d.libelle from ged_dossiers d join ged_dossiers p on p.id = d.parent_dossier_id
        where d.organisation_id = $1 and p.code = $2 and d.supprime_le is null and d.actif`,
      [org, serie],
    );
    const proc = /restreint/.test(t) ? 'ao restreint' : /\bami\b|manifestation/.test(t) ? 'ami' : /\bdrp\b|demande de renseignement/.test(t) ? 'drp' : /\bed\b|entente/.test(t) ? 'ed' : /\bdc\b|cotation/.test(t) ? 'dc' : /\bao|appel d.offres/.test(t) ? 'ao' : null;
    const r = proc ? rubriques.find((x) => sansAccents(x.libelle) === proc) : undefined;
    return r ?? par(serie);
  }

  // ---------- Lancement ----------

  async lancer(user: AuthenticatedUser, debut: string, fin: string, modules: ModuleVerse[], programme = false) {
    if (!programme) await this.assertAutorise(user);
    this.controlerPeriode(debut, fin, modules);
    const apercu = await this.detecter(user.organisationId, debut, fin, modules);
    const lancementId: string = (
      await this.dataSource.query(
        `insert into ged_lancements_auto (organisation_id, date_debut, date_fin, modules, programme, lance_par)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [user.organisationId, debut, fin, modules, programme, user.id],
      )
    )[0].id;
    const ecartes: Ecarte[] = [...apercu.ecartes];
    const crees: Array<{ id: string; titre: string }> = [];
    let nbElements = 0;
    let nbDocuments = 0;

    for (const g of apercu.groupes) {
      let versement: GedVersement | null = null;
      try {
        versement = await this.versements.save(
          this.versements.create({
            organisationId: user.organisationId,
            entiteId: g.directionId,
            dossierCibleId: g.dossierCibleId,
            objet: g.titre,
            description: `Versement automatique (${g.nbElements} élément${g.nbElements > 1 ? 's' : ''}) — période du ${fr(debut)} au ${fr(fin)}.`,
            dateDebutExtreme: g.dateDebut,
            dateFinExtreme: g.dateFin,
            brouillon: true,
            redacteurId: user.id,
            origine: 'automatique',
            lancementId,
          }),
        );
        let docs = 0;
        for (const e of g.elements) {
          const n = await this.rattacherDocuments(versement, e, user);
          docs += n;
          await this.dataSource.query(
            `insert into ged_versement_elements (organisation_id, versement_id, type_element, element_id, reference, libelle, date_element, nb_documents)
             values ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [user.organisationId, versement.id, e.type, e.id, e.reference, e.libelle, e.date, n],
          );
        }
        if (docs === 0) throw new Error('aucun document n’a pu être joint');
        await this.versementsService.soumettre(versement.id, user);
        crees.push({ id: versement.id, titre: g.titre });
        nbElements += g.nbElements;
        nbDocuments += docs;
      } catch (err) {
        this.logger.error(`Versement automatique « ${g.titre} » : ${(err as Error).message}`);
        if (versement) await this.defaire(versement.id);
        ecartes.push({ type: g.type, reference: g.regroupement, libelle: g.titre, motif: `Erreur : ${(err as Error).message}` });
      }
    }

    await this.dataSource.query(
      `update ged_lancements_auto set nb_versements = $2, nb_elements = $3, nb_documents = $4, ecartes = $5 where id = $1`,
      [lancementId, crees.length, nbElements, nbDocuments, JSON.stringify(ecartes.slice(0, 1000))],
    );
    await this.dataSource.query(
      `insert into journal_audit (utilisateur_id, organisation_id, objet_type, objet_id, nouvelle_valeur)
       values ($1, $2, 'ged_versement_automatique', $3, $4)`,
      [user.id, user.organisationId, lancementId, JSON.stringify({ debut, fin, modules, programme, versements: crees.length, elements: nbElements, documents: nbDocuments })],
    );
    return { lancementId, versements: crees, nbElements, nbDocuments, ecartes };
  }

  private async rattacherDocuments(versement: GedVersement, e: Element, user: AuthenticatedUser): Promise<number> {
    if (e.type === 'projet' || e.type === 'marche') {
      const condition =
        e.type === 'projet'
          ? `(projet_id = $2 or livrable_id in (select id from livrables where projet_id = $2)
              or avenant_id in (select id from avenants where projet_id = $2)
              or decaissement_id in (select id from decaissements where projet_id = $2))`
          : `(marche_id = $2 or phase_marche_id in (select id from phases_marche where marche_id = $2)
              or marche_candidat_id in (select id from marche_candidats where marche_id = $2))`;
      const [, n] = (await this.dataSource.query(
        `update documents set versement_id = $1
          where supprime_le is null and version_courante_id is not null and versement_id is null and ${condition}`,
        [versement.id, e.id],
      )) as [unknown, number];
      return n;
    }
    // Courrier : chaque pièce jointe devient un document GED (copie du fichier),
    // reliée à sa pièce d'origine.
    const pieces: Array<{ id: string; storage_path: string; nom_fichier: string; type_mime: string | null; est_scan: boolean }> = await this.dataSource.query(
      `select id, storage_path, nom_fichier, type_mime, est_scan from courrier_pieces_jointes
        where courrier_id = $1 and storage_path is not null order by est_scan desc, created_at`,
      [e.id],
    );
    const racine = path.resolve(getStorageRoot());
    let n = 0;
    for (const p of pieces) {
      const absolu = path.resolve(racine, p.storage_path);
      if (!absolu.startsWith(racine + path.sep)) continue;
      let buffer: Buffer;
      try {
        buffer = await fs.readFile(absolu);
      } catch {
        this.logger.warn(`Pièce introuvable sur le disque : ${p.storage_path}`);
        continue;
      }
      const document = await this.documents.save(
        this.documents.create({
          organisationId: versement.organisationId,
          versementId: versement.id,
          entiteId: versement.entiteId,
          titre: `${e.reference} — ${p.est_scan ? 'Courrier' : p.nom_fichier.replace(/\.[^.]+$/, '')}`,
          description: e.libelle,
          createdBy: user.id,
        }),
      );
      await this.storage.verserVersion(document.id, { buffer, originalname: p.nom_fichier, mimetype: p.type_mime ?? 'application/octet-stream', size: buffer.length }, null, user);
      await this.dataSource.query('update courrier_pieces_jointes set document_id = $2 where id = $1', [p.id, document.id]);
      n++;
    }
    return n;
  }

  // Annule un versement automatique incomplet : les documents des projets et
  // marchés sont seulement détachés ; les copies des pièces de courrier supprimées.
  private async defaire(versementId: string): Promise<void> {
    const copies: Array<{ id: string; storage_path: string | null }> = await this.dataSource.query(
      `select d.id, v.storage_path from documents d left join document_versions v on v.document_id = d.id
        where d.versement_id = $1 and d.projet_id is null and d.livrable_id is null and d.avenant_id is null and d.decaissement_id is null
          and d.marche_id is null and d.phase_marche_id is null and d.marche_candidat_id is null`,
      [versementId],
    );
    await this.dataSource.transaction(async (m) => {
      const ids = [...new Set(copies.map((c) => c.id))];
      if (ids.length) {
        await m.query('update courrier_pieces_jointes set document_id = null where document_id = any($1)', [ids]);
        await m.query('update documents set version_courante_id = null where id = any($1)', [ids]);
        await m.query('delete from documents where id = any($1)', [ids]);
      }
      await m.query('update documents set versement_id = null where versement_id = $1', [versementId]);
      await m.query('delete from ged_versements where id = $1', [versementId]);
    });
    const racine = path.resolve(getStorageRoot(), 'ged');
    for (const c of copies) {
      if (!c.storage_path) continue;
      const absolu = path.resolve(racine, c.storage_path);
      if (absolu.startsWith(racine + path.sep)) await fs.unlink(absolu).catch(() => undefined);
    }
  }

  // ---------- Consultation ----------

  async lancements(user: AuthenticatedUser) {
    await this.assertAutorise(user);
    return this.dataSource.query(
      `select l.id, l.date_debut, l.date_fin, l.modules, l.programme, l.lance_le, l.nb_versements, l.nb_elements, l.nb_documents,
              jsonb_array_length(l.ecartes) as nb_ecartes, l.ecartes,
              coalesce(u.prenom || ' ' || u.nom, 'Lancement programmé') as lance_par
         from ged_lancements_auto l left join utilisateurs u on u.id = l.lance_par
        where l.organisation_id = $1 order by l.lance_le desc limit 50`,
      [user.organisationId],
    );
  }

  async elementsDuVersement(versementId: string, user: AuthenticatedUser) {
    await this.versementsService.findOne(versementId, user);
    return this.dataSource.query(
      `select type_element, element_id, reference, libelle, to_char(date_element, 'YYYY-MM-DD') as date_element, nb_documents
         from ged_versement_elements where versement_id = $1 order by date_element, reference`,
      [versementId],
    );
  }

  // Badge « En cours de versement » / « Archivé » dans les modules.
  async statutElement(type: string, elementId: string, user: AuthenticatedUser) {
    const rows: Array<{ versement_id: string; etape_code: string | null; code_archivage: string | null }> = await this.dataSource.query(
      `select e.versement_id, v.etape_code, v.code_archivage from ged_versement_elements e
         join ged_versements v on v.id = e.versement_id and v.supprime_le is null
        where e.organisation_id = $1 and e.type_element = $2 and e.element_id = $3 limit 1`,
      [user.organisationId, type, elementId],
    );
    const r = rows[0];
    if (!r) return { etat: null };
    return { etat: r.etape_code === 'archivage' ? 'archive' : 'en_cours', versementId: r.versement_id, codeArchivage: r.code_archivage };
  }

  // ---------- Lancement programmé (2 janvier) ----------

  async parametre(user: AuthenticatedUser) {
    await this.assertAutorise(user);
    const rows: Array<{ actif: boolean | null }> = await this.dataSource.query(
      `select (valeur->>'actif')::boolean as actif from parametres_organisation where organisation_id = $1 and cle = $2`,
      [user.organisationId, CLE_PARAMETRE],
    );
    return { annuelActif: rows[0]?.actif ?? false };
  }

  async definirParametre(user: AuthenticatedUser, actif: boolean) {
    await this.assertAutorise(user);
    await this.dataSource.query(
      `insert into parametres_organisation (organisation_id, cle, valeur) values ($1, $2, jsonb_build_object('actif', $3::boolean))
       on conflict (organisation_id, cle) do update set valeur = excluded.valeur`,
      [user.organisationId, CLE_PARAMETRE, actif],
    );
    return { annuelActif: actif };
  }

  @Cron('0 15 6 * * *')
  async lancementProgramme(): Promise<void> {
    const maintenant = new Date();
    if (maintenant.getMonth() !== 0 || maintenant.getDate() < 2) return; // à partir du 2 janvier
    const annee = maintenant.getFullYear() - 1;
    const orgs: Array<{ organisation_id: string }> = await this.dataSource.query(
      `select organisation_id from parametres_organisation where cle = $1 and (valeur->>'actif')::boolean`,
      [CLE_PARAMETRE],
    );
    for (const { organisation_id } of orgs) {
      const deja: unknown[] = await this.dataSource.query(
        `select 1 from ged_lancements_auto where organisation_id = $1 and programme and date_debut = $2 limit 1`,
        [organisation_id, `${annee}-01-01`],
      );
      if (deja.length) continue;
      const archivistes = await this.acces.archivistes(organisation_id);
      if (!archivistes.length) continue;
      const u: Array<{ id: string; email: string; nom: string; prenom: string; entite_id: string | null }> = await this.dataSource.query(
        'select id, email, nom, prenom, entite_id from utilisateurs where id = $1',
        [archivistes[0]],
      );
      if (!u[0]) continue;
      try {
        const r = await this.lancer(
          { id: u[0].id, email: u[0].email, nom: u[0].nom, prenom: u[0].prenom, organisationId: organisation_id, entiteId: u[0].entite_id },
          `${annee}-01-01`,
          `${annee}-12-31`,
          MODULES,
          true,
        );
        this.logger.log(`Versements automatiques ${annee} : ${r.versements.length} versement(s) créé(s)`);
      } catch (err) {
        this.logger.error(`Lancement programmé ${annee} : ${(err as Error).message}`);
      }
    }
  }
}
