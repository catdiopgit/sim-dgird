import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Associe une définition de workflow non-défaut à une valeur de liste précise
// (ex. le sens d'un courrier) — au plus une définition par valeur de liste
// (contrainte unique SQL sur valeur_liste_id).
@Entity('workflow_definition_associations')
export class WorkflowDefinitionAssociation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workflow_definition_id' })
  workflowDefinitionId: string;

  @Column({ type: 'uuid', name: 'valeur_liste_id' })
  valeurListeId: string;
}
