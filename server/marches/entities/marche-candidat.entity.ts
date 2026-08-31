import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TypeCandidatMarche = 'entreprise' | 'consultant';

// Entreprise/consultant participant à la procédure (§15, fonctionnalité
// optionnelle). Offres technique/financière rattachées via `documents`
// (colonne marche_candidat_id, typées par type_marche_valeur_id).
@Entity('marche_candidats')
export class MarcheCandidat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'marche_id' })
  marcheId: string;

  @Column({ type: 'text' })
  nom: string;

  @Column({
    type: 'enum',
    enum: ['entreprise', 'consultant'],
    enumName: 'type_candidat_marche',
  })
  type: TypeCandidatMarche;

  @Column({ type: 'text', nullable: true })
  coordonnees: string | null;

  @Column({ type: 'text', name: 'informations_complementaires', nullable: true })
  informationsComplementaires: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
