import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('parametres_organisation')
export class ParametreOrganisation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'text' })
  cle: string;

  @Column({ type: 'jsonb' })
  valeur: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
