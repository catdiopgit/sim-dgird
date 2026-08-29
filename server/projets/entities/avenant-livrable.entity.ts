import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TypeImpactAvenant = 'cree' | 'modifie' | 'supprime';

@Entity('avenant_livrables')
export class AvenantLivrable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'avenant_id' })
  avenantId: string;

  // null quand type_impact = 'cree' et que le nouveau livrable n'existe pas
  // encore au moment de la saisie de l'avenant.
  @Column({ type: 'uuid', name: 'livrable_id', nullable: true })
  livrableId: string | null;

  @Column({ type: 'enum', enum: ['cree', 'modifie', 'supprime'], enumName: 'type_impact_avenant', name: 'type_impact' })
  typeImpact: TypeImpactAvenant;

  @Column({ type: 'boolean', name: 'echeance_modifiee' })
  echeanceModifiee: boolean;

  @Column({ type: 'boolean', name: 'contenu_modifie' })
  contenuModifie: boolean;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
