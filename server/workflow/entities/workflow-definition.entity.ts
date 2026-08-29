import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'module_id' })
  moduleId: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text' })
  libelle: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  // Un seul workflow par défaut par (organisation, module) — imposé par un index
  // unique partiel côté SQL (idx_workflow_definitions_defaut). La bascule atomique
  // se fait via WorkflowService.definirDefaut(), jamais par un simple update ici.
  @Column({ type: 'boolean', name: 'est_defaut', default: false })
  estDefaut: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
