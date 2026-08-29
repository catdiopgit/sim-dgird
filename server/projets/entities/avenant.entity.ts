import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

@Entity('avenants')
export class Avenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projet_id' })
  projetId: string;

  @Column({ type: 'text' })
  reference: string;

  @Column({ type: 'date', name: 'date_avenant' })
  dateAvenant: string;

  @Column({ type: 'text' })
  objet: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  motif: string | null;

  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer })
  montant: number | null;

  @Column({ type: 'text', name: 'duree_initiale', nullable: true })
  dureeInitiale: string | null;

  @Column({ type: 'text', name: 'nouvelle_duree', nullable: true })
  nouvelleDuree: string | null;

  @Column({ type: 'date', name: 'date_debut', nullable: true })
  dateDebut: string | null;

  @Column({ type: 'date', name: 'nouvelle_date_fin', nullable: true })
  nouvelleDateFin: string | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
