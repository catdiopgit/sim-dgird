import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type StatutInstanceWorkflow = 'en_cours' | 'terminee' | 'annulee';

// Écriture réservée à WorkflowEngineService (demarrerWorkflow / executerTransition) —
// aucune écriture directe via repository ailleurs, pour garder la parité avec le
// SECURITY DEFINER + REVOKE d'origine (aucune policy INSERT/UPDATE/DELETE côté SQL).
@Entity('workflow_instances')
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workflow_definition_id' })
  workflowDefinitionId: string;

  @Column({ type: 'uuid', name: 'etape_courante_id' })
  etapeCouranteId: string;

  // Horodatage d'entrée dans l'étape courante — base du calcul de retard
  // (fn_detecter_et_notifier_retards, à porter en Phase 3+).
  @Column({ type: 'timestamptz', name: 'etape_courante_depuis' })
  etapeCouranteDepuis: Date;

  @Column({
    type: 'enum',
    enum: ['en_cours', 'terminee', 'annulee'],
    enumName: 'statut_instance_workflow',
    name: 'statut_instance',
    default: 'en_cours',
  })
  statutInstance: StatutInstanceWorkflow;

  @CreateDateColumn({ name: 'demarre_le' })
  demarreLe: Date;

  @Column({ type: 'timestamptz', name: 'termine_le', nullable: true })
  termineLe: Date | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
