import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReinitialisationNumerotation = 'annuelle' | 'mensuelle' | 'jamais';

@Entity('regles_numerotation')
export class RegleNumerotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'module_id' })
  moduleId: string;

  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'uuid', name: 'valeur_liste_id', nullable: true })
  valeurListeId: string | null;

  @Column({ type: 'text' })
  format: string;

  @Column({ type: 'int', name: 'sequence_courante', default: 0 })
  sequenceCourante: number;

  @Column({
    type: 'enum',
    enum: ['annuelle', 'mensuelle', 'jamais'],
    enumName: 'reinitialisation_numerotation',
    default: 'annuelle',
  })
  reinitialisation: ReinitialisationNumerotation;

  @Column({ type: 'timestamptz', name: 'derniere_reinitialisation_le', nullable: true })
  derniereReinitialisationLe: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'int', name: 'niveau_racine_chemin', nullable: true })
  niveauRacineChemin: number | null;
}
