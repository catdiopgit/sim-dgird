import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('mission_actions_suivi')
export class MissionActionSuivi {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'mission_id' })
  missionId: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid', name: 'responsable_id', nullable: true })
  responsableId: string | null;

  @Column({ type: 'date', name: 'date_echeance', nullable: true })
  dateEcheance: string | null;

  @Column({ type: 'uuid', name: 'statut_valeur_id', nullable: true })
  statutValeurId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
