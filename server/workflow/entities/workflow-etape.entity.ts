import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TypeEtapeWorkflow = 'initiale' | 'intermediaire' | 'finale' | 'rejet';

@Entity('workflow_etapes')
export class WorkflowEtape {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workflow_definition_id' })
  workflowDefinitionId: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text' })
  libelle: string;

  @Column({ type: 'int', default: 0 })
  ordre: number;

  // Exactement une étape 'initiale' par définition — imposé par un index unique
  // partiel côté SQL (idx_workflow_etapes_initiale).
  @Column({
    type: 'enum',
    enum: ['initiale', 'intermediaire', 'finale', 'rejet'],
    enumName: 'type_etape_workflow',
    name: 'type_etape',
    default: 'intermediaire',
  })
  typeEtape: TypeEtapeWorkflow;

  // Utilisé par fn_detecter_et_notifier_retards (à porter en Phase 3+, une fois
  // les tables Courrier/GED/Missions disponibles pour résoudre l'objet porteur).
  @Column({ type: 'int', name: 'delai_jours', nullable: true })
  delaiJours: number | null;

  @Column({ type: 'text', nullable: true })
  couleur: string | null;

  // Éditeur graphique du référentiel (frontend), aucun usage moteur.
  @Column({ type: 'int', name: 'position_x', nullable: true })
  positionX: number | null;

  @Column({ type: 'int', name: 'position_y', nullable: true })
  positionY: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
