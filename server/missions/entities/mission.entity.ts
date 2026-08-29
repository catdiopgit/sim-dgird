import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'entite_id' })
  entiteId: string;

  @Column({ type: 'text' })
  reference: string;

  @Column({ type: 'text' })
  objet: string;

  @Column({ type: 'uuid', name: 'responsable_id', nullable: true })
  responsableId: string | null;

  @Column({ type: 'text', nullable: true })
  lieu: string | null;

  @Column({ type: 'date', name: 'date_depart' })
  dateDepart: string;

  @Column({ type: 'date', name: 'date_retour' })
  dateRetour: string;

  @Column({ type: 'text', nullable: true })
  objectifs: string | null;

  @Column({ type: 'text', name: 'activites_prevues', nullable: true })
  activitesPrevues: string | null;

  @Column({ type: 'numeric', name: 'budget_prevu', nullable: true, transformer: numericTransformer })
  budgetPrevu: number | null;

  // Recalculé automatiquement par le trigger SQL app.trg_mission_depenses_recalcule_budget
  // (0077, catégorie technique de facto — voir MIGRATION.md Phase 6) à chaque
  // écriture sur mission_depenses, y compris via TypeORM.
  @Column({ type: 'numeric', name: 'budget_reel', nullable: true, transformer: numericTransformer })
  budgetReel: number | null;

  @Column({ type: 'uuid', name: 'workflow_instance_id', nullable: true })
  workflowInstanceId: string | null;

  // Maintenu par le trigger SQL app.sync_etape_cache (catégorie 1, 0011).
  @Column({ type: 'text', name: 'etape_code', nullable: true })
  etapeCode: string | null;

  @Column({ type: 'text', name: 'etape_libelle', nullable: true })
  etapeLibelle: string | null;

  @Column({ type: 'uuid', name: 'ordre_mission_document_id', nullable: true })
  ordreMissionDocumentId: string | null;

  @Column({ type: 'uuid', name: 'compte_rendu_document_id', nullable: true })
  compteRenduDocumentId: string | null;

  @Column({ type: 'uuid', name: 'pv_document_id', nullable: true })
  pvDocumentId: string | null;

  @Column({ type: 'text', nullable: true })
  recommandations: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
