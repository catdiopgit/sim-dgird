import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

@Entity('decaissements')
export class Decaissement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projet_id' })
  projetId: string;

  // §2/§4 (0075) : origine du décaissement — null = contrat d'origine (le
  // budget_prevu du projet sert alors de plafond), sinon un avenant précis
  // (son montant sert de plafond) — voir app.fn_verifier_decaissement (0075).
  @Column({ type: 'uuid', name: 'avenant_id', nullable: true })
  avenantId: string | null;

  @Column({ type: 'numeric', transformer: numericTransformer })
  pourcentage: number;

  @Column({ type: 'numeric', transformer: numericTransformer })
  montant: number;

  @Column({ type: 'date', name: 'date_decaissement' })
  dateDecaissement: string;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
