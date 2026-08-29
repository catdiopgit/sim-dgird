import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ListeValeur } from './entities/liste-valeur.entity';
import { ValeurListe } from './entities/valeur-liste.entity';
import { RegleNumerotation } from './entities/regle-numerotation.entity';

interface RegleNumerotationRow {
  id: string;
  format: string;
  sequence_courante: number;
  reinitialisation: 'annuelle' | 'mensuelle' | 'jamais';
  derniere_reinitialisation_le: string | null;
  niveau_racine_chemin: number | null;
}

@Injectable()
export class ParametrageService {
  constructor(
    @InjectRepository(ListeValeur) private readonly listesValeurs: Repository<ListeValeur>,
    @InjectRepository(ValeurListe) private readonly valeursListes: Repository<ValeurListe>,
    @InjectRepository(RegleNumerotation) private readonly reglesNumerotation: Repository<RegleNumerotation>,
  ) {}

  listListes(organisationId: string): Promise<ListeValeur[]> {
    return this.listesValeurs.find({ where: { organisationId }, order: { libelle: 'ASC' } });
  }

  async findListeParCode(organisationId: string, code: string): Promise<ListeValeur> {
    const liste = await this.listesValeurs.findOneBy({ organisationId, code });
    if (!liste) throw new NotFoundException(`Liste de valeurs "${code}" introuvable`);
    return liste;
  }

  listValeurs(listeId: string): Promise<ValeurListe[]> {
    return this.valeursListes.find({ where: { listeId }, order: { ordre: 'ASC' } });
  }

  createListe(data: Partial<ListeValeur>): Promise<ListeValeur> {
    return this.listesValeurs.save(this.listesValeurs.create(data));
  }

  async updateListe(id: string, data: Partial<ListeValeur>): Promise<ListeValeur> {
    await this.listesValeurs.update(id, data);
    const liste = await this.listesValeurs.findOneBy({ id });
    if (!liste) throw new NotFoundException('Liste de valeurs introuvable');
    return liste;
  }

  async deleteListe(id: string): Promise<void> {
    await this.listesValeurs.delete(id);
  }

  createValeur(data: Partial<ValeurListe>): Promise<ValeurListe> {
    return this.valeursListes.save(this.valeursListes.create(data));
  }

  async deleteValeur(id: string): Promise<void> {
    await this.valeursListes.delete(id);
  }

  // Cast ciblé : la colonne jsonb `metadata` (Record<string, unknown>) fait buter
  // le typage DeepPartial de TypeORM sur update() (limitation connue avec les
  // index signatures), sans rapport avec la validité des données.
  async updateValeur(id: string, data: Partial<ValeurListe>): Promise<ValeurListe> {
    await this.valeursListes.update(id, data as Parameters<typeof this.valeursListes.update>[1]);
    const valeur = await this.valeursListes.findOneBy({ id });
    if (!valeur) throw new NotFoundException('Valeur de liste introuvable');
    return valeur;
  }

  listReglesNumerotation(organisationId: string): Promise<RegleNumerotation[]> {
    return this.reglesNumerotation.find({ where: { organisationId } });
  }

  upsertRegleNumerotation(data: Partial<RegleNumerotation>): Promise<RegleNumerotation> {
    return this.reglesNumerotation.save(this.reglesNumerotation.create(data));
  }

  async deleteRegleNumerotation(id: string): Promise<void> {
    await this.reglesNumerotation.delete(id);
  }

  // Portage de app.fn_generer_numero (0040_courrier_v4_bannette_sortants_sigle.sql).
  // Prend un EntityManager explicite pour composer dans la transaction de
  // l'appelant (CourriersService.creerCourrier) — le verrou FOR UPDATE sur la règle
  // et l'incrément de séquence doivent faire partie de cette même transaction.
  async genererNumero(
    manager: EntityManager,
    organisationId: string,
    moduleCode: string,
    entiteId: string | null,
    valeurListeId: string | null,
  ): Promise<string> {
    const moduleRows: Array<{ id: string }> = await manager.query('select id from modules where code = $1', [
      moduleCode,
    ]);
    const moduleId = moduleRows[0]?.id;
    if (!moduleId) throw new NotFoundException(`Module '${moduleCode}' introuvable`);

    // Recherche la règle la plus spécifique (entité + valeur de liste), puis
    // entité seule, puis règle par défaut du module — chacune verrouillée en lecture.
    const tentatives: Array<[string, unknown[]]> = [
      [
        `select * from regles_numerotation
         where organisation_id = $1 and module_id = $2
           and entite_id is not distinct from $3 and valeur_liste_id is not distinct from $4
         for update`,
        [organisationId, moduleId, entiteId, valeurListeId],
      ],
      [
        `select * from regles_numerotation
         where organisation_id = $1 and module_id = $2
           and entite_id is null and valeur_liste_id is not distinct from $3
         for update`,
        [organisationId, moduleId, valeurListeId],
      ],
      [
        `select * from regles_numerotation
         where organisation_id = $1 and module_id = $2 and entite_id is null and valeur_liste_id is null
         for update`,
        [organisationId, moduleId],
      ],
    ];

    let regle: RegleNumerotationRow | undefined;
    for (const [sql, params] of tentatives) {
      const rows: RegleNumerotationRow[] = await manager.query(sql, params);
      if (rows[0]) {
        regle = rows[0];
        break;
      }
    }
    if (!regle) throw new NotFoundException(`Aucune règle de numérotation pour le module '${moduleCode}'`);

    const maintenant = new Date();
    const reinitialise = this.doitReinitialiser(regle, maintenant);
    const sequence = reinitialise ? 1 : regle.sequence_courante + 1;
    await manager.query('update regles_numerotation set sequence_courante = $2, derniere_reinitialisation_le = $3 where id = $1', [
      regle.id,
      sequence,
      reinitialise ? maintenant : regle.derniere_reinitialisation_le,
    ]);

    let cheminEntite = '';
    let entiteLabel = '';
    if (entiteId && (regle.format.includes('{ENTITE}') || regle.format.includes('{CHEMIN_ENTITE}'))) {
      const chaine = await this.resoudreCheminEntite(manager, entiteId, regle.niveau_racine_chemin);
      cheminEntite = chaine.join('/');
      entiteLabel = chaine[chaine.length - 1] ?? '';
    }
    const orgRows: Array<{ code: string }> = await manager.query('select code from organisations where id = $1', [
      organisationId,
    ]);

    return this.formaterNumero(regle.format, {
      sequence,
      date: maintenant,
      organisationCode: orgRows[0]?.code ?? '',
      entiteLabel,
      cheminEntite,
    });
  }

  private doitReinitialiser(regle: RegleNumerotationRow, maintenant: Date): boolean {
    if (regle.reinitialisation === 'jamais') return false;
    if (!regle.derniere_reinitialisation_le) return true;
    const derniere = new Date(regle.derniere_reinitialisation_le);
    if (regle.reinitialisation === 'annuelle') return derniere.getFullYear() !== maintenant.getFullYear();
    return derniere.getFullYear() !== maintenant.getFullYear() || derniere.getMonth() !== maintenant.getMonth();
  }

  // Marche vers la racine via parent_entite_id, filtrée par niveau_racine_chemin
  // quand la règle en définit un, ordre racine -> feuille.
  private async resoudreCheminEntite(
    manager: EntityManager,
    entiteId: string,
    niveauRacineChemin: number | null,
  ): Promise<string[]> {
    const rows: Array<{ label: string }> = await manager.query(
      `with recursive chaine as (
         select id, parent_entite_id, coalesce(sigle, code) as label, niveau, 0 as profondeur
         from entites where id = $1
         union all
         select e.id, e.parent_entite_id, coalesce(e.sigle, e.code), e.niveau, c.profondeur + 1
         from entites e join chaine c on e.id = c.parent_entite_id
       )
       select label from chaine
       where $2::int is null or niveau >= $2::int
       order by profondeur desc`,
      [entiteId, niveauRacineChemin],
    );
    return rows.map((r) => r.label);
  }

  private formaterNumero(
    format: string,
    ctx: { sequence: number; date: Date; organisationCode: string; entiteLabel: string; cheminEntite: string },
  ): string {
    return format
      .replace(/\{SEQ(?::(\d+))?\}/g, (_match, largeur?: string) =>
        String(ctx.sequence).padStart(largeur ? Number(largeur) : 1, '0'),
      )
      .replace(/\{ANNEE\}/g, String(ctx.date.getFullYear()))
      .replace(/\{MOIS\}/g, String(ctx.date.getMonth() + 1).padStart(2, '0'))
      .replace(/\{ORGANISATION\}/g, ctx.organisationCode)
      .replace(/\{ENTITE\}/g, ctx.entiteLabel)
      .replace(/\{CHEMIN_ENTITE\}/g, ctx.cheminEntite);
  }
}
