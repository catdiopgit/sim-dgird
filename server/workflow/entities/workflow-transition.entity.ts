import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TypeActionCourrier = 'imputation' | 'affectation' | 'transmission' | 'redirection';

@Entity('workflow_transitions')
export class WorkflowTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workflow_definition_id' })
  workflowDefinitionId: string;

  // null = déclenchable depuis n'importe quelle étape courante de la définition.
  @Column({ type: 'uuid', name: 'etape_source_id', nullable: true })
  etapeSourceId: string | null;

  @Column({ type: 'uuid', name: 'etape_cible_id' })
  etapeCibleId: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text', name: 'libelle_action' })
  libelleAction: string;

  // Forme : { champ, operateur, valeur } — évaluée par condition.util.ts
  // (portage fidèle de app.fn_condition_satisfaite) contre le contexte fourni
  // par l'appelant (to_jsonb de la ligne métier porteuse : courrier, mission...).
  @Column({ type: 'jsonb', nullable: true })
  condition: Record<string, unknown> | null;

  // Spécifique Courrier (indication pour l'UI : quelle modale d'action afficher) ;
  // stocké sur la table générique côté SQL d'origine, nullable pour les autres modules.
  @Column({
    type: 'enum',
    enum: ['imputation', 'affectation', 'transmission', 'redirection'],
    enumName: 'type_action_courrier',
    name: 'type_action',
    nullable: true,
  })
  typeAction: TypeActionCourrier | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
