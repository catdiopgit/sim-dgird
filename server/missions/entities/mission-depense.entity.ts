import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

@Entity('mission_depenses')
export class MissionDepense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'mission_id' })
  missionId: string;

  @Column({ type: 'text' })
  libelle: string;

  @Column({ type: 'numeric', transformer: numericTransformer })
  montant: number;

  @Column({ type: 'date', name: 'date_depense' })
  dateDepense: string;

  @Column({ type: 'uuid', name: 'justificatif_document_id', nullable: true })
  justificatifDocumentId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
