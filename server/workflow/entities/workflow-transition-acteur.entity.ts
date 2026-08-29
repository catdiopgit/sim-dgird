import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TypeActeurWorkflow =
  | 'role'
  | 'fonction'
  | 'entite'
  | 'entite_et_descendants'
  | 'utilisateur'
  | 'responsable_entite_courante'
  | 'superieur_hierarchique_courant';

// Table `workflow_transition_roles` (nom hérité de la v1, étendue en v2/0020 pour
// porter tous les types d'acteur). Aucune ligne pour une transition = ouverte à
// tout utilisateur ayant accès à l'objet porteur (contrôle fait en amont par le
// module métier) — voir WorkflowEngineService.acteurDeTransitionAutorise.
@Entity('workflow_transition_roles')
export class WorkflowTransitionActeur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workflow_transition_id' })
  workflowTransitionId: string;

  @Column({
    type: 'enum',
    enum: [
      'role',
      'fonction',
      'entite',
      'entite_et_descendants',
      'utilisateur',
      'responsable_entite_courante',
      'superieur_hierarchique_courant',
    ],
    enumName: 'type_acteur_workflow',
    name: 'type_acteur',
    default: 'role',
  })
  typeActeur: TypeActeurWorkflow;

  // Exactement une des quatre colonnes ci-dessous doit être renseignée selon
  // typeActeur (CHECK contrainte workflow_transition_roles_type_ck côté SQL) ;
  // les deux types 'courant' (responsable/supérieur hiérarchique) exigent que
  // les quatre soient nulles. Revalidé côté service (WorkflowService.createActeur).
  @Column({ type: 'uuid', name: 'role_id', nullable: true })
  roleId: string | null;

  @Column({ type: 'uuid', name: 'fonction_id', nullable: true })
  fonctionId: string | null;

  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'uuid', name: 'utilisateur_id', nullable: true })
  utilisateurId: string | null;
}
