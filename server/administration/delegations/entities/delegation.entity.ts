import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('delegations')
export class Delegation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'delegant_id' })
  delegantId: string;

  @Column({ type: 'uuid', name: 'delegataire_id' })
  delegataireId: string;

  @Column({ type: 'uuid', name: 'module_id', nullable: true })
  moduleId: string | null;

  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'date', name: 'date_debut' })
  dateDebut: string;

  @Column({ type: 'date', name: 'date_fin', nullable: true })
  dateFin: string | null;

  @Column({ type: 'text', nullable: true })
  motif: string | null;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
