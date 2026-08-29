import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('valeurs_listes')
export class ValeurListe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'liste_id' })
  listeId: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text' })
  libelle: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  couleur: string | null;

  @Column({ type: 'int', default: 0 })
  ordre: number;

  @Column({ type: 'boolean', name: 'valeur_defaut', default: false })
  valeurDefaut: boolean;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
