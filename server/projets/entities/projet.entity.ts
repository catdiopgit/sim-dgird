import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

export type PorteeVisibiliteProjet = 'membres' | 'entites' | 'agents' | 'tous';
export type StatutClotureProjet = 'aucune' | 'demandee' | 'confirmee' | 'rejetee';
export type OrganismeExecutionType = 'organisation' | 'consultant' | 'entreprise' | 'externe';

@Entity('projets')
export class Projet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'entite_id' })
  entiteId: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text' })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', name: 'responsable_id', nullable: true })
  responsableId: string | null;

  // Ex-sponsor_id (uuid) : renommé/retypé en texte libre par 0069 (bailleur,
  // ligne budgétaire... plus forcément une personne du système).
  @Column({ type: 'text', nullable: true })
  financement: string | null;

  @Column({ type: 'date', name: 'date_debut', nullable: true })
  dateDebut: string | null;

  @Column({ type: 'date', name: 'date_fin_prevue', nullable: true })
  dateFinPrevue: string | null;

  @Column({ type: 'date', name: 'date_fin_reelle', nullable: true })
  dateFinReelle: string | null;

  @Column({ type: 'numeric', name: 'budget_prevu', nullable: true, transformer: numericTransformer })
  budgetPrevu: number | null;

  @Column({ type: 'numeric', name: 'budget_reel', nullable: true, transformer: numericTransformer })
  budgetReel: number | null;

  @Column({ type: 'uuid', name: 'statut_valeur_id', nullable: true })
  statutValeurId: string | null;

  @Column({ type: 'uuid', name: 'priorite_valeur_id', nullable: true })
  prioriteValeurId: string | null;

  // Maintenu par le trigger SQL app.trg_livrables_recalcule_avancement (0073,
  // catégorie 1 de facto — voir MIGRATION.md) : jamais écrit directement par ce
  // module, recalculé automatiquement à chaque écriture sur `livrables`.
  @Column({ type: 'numeric', name: 'avancement_pct', transformer: numericTransformer })
  avancementPct: number;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', name: 'coordonnateur_id', nullable: true })
  coordonnateurId: string | null;

  @Column({ type: 'text', name: 'lieu_execution', nullable: true })
  lieuExecution: string | null;

  @Column({
    type: 'enum',
    enum: ['membres', 'entites', 'agents', 'tous'],
    enumName: 'portee_visibilite_projet',
    name: 'portee_visibilite',
  })
  porteeVisibilite: PorteeVisibiliteProjet;

  // cloture_* : n'est censé être écrit que par ProjetsService.demanderCloture/
  // confirmerCloture/rejeterCloture (portage de 0066/0070) — jamais via update()
  // direct (voir UpdateProjetData, qui les exclut).
  @Column({
    type: 'enum',
    enum: ['aucune', 'demandee', 'confirmee', 'rejetee'],
    enumName: 'statut_cloture_projet',
    name: 'cloture_statut',
  })
  clotureStatut: StatutClotureProjet;

  @Column({ type: 'uuid', name: 'cloture_demandee_par', nullable: true })
  clotureDemandeePar: string | null;

  @Column({ type: 'timestamptz', name: 'cloture_demandee_le', nullable: true })
  clotureDemandeeLe: Date | null;

  @Column({ type: 'uuid', name: 'cloture_confirmee_par', nullable: true })
  clotureConfirmeePar: string | null;

  @Column({ type: 'timestamptz', name: 'cloture_confirmee_le', nullable: true })
  clotureConfirmeeLe: Date | null;

  @Column({ type: 'text', name: 'cloture_motif_rejet', nullable: true })
  clotureMotifRejet: string | null;

  @Column({
    type: 'enum',
    enum: ['organisation', 'consultant', 'entreprise', 'externe'],
    enumName: 'organisme_execution_type',
    name: 'organisme_execution_type',
  })
  organismeExecutionType: OrganismeExecutionType;

  @Column({ type: 'text', name: 'organisme_execution_nom', nullable: true })
  organismeExecutionNom: string | null;

  @Column({ type: 'uuid', name: 'charge_execution_utilisateur_id', nullable: true })
  chargeExecutionUtilisateurId: string | null;

  @Column({ type: 'uuid', name: 'charge_execution_contact_id', nullable: true })
  chargeExecutionContactId: string | null;
}
