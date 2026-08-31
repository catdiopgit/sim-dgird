import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

// Attribution du marché (§16) — un seul enregistrement par marché (contrainte
// unique sur marche_id), modifiable tant que le marché n'est pas clôturé. Les
// avis d'attribution provisoire/définitive sont des `documents` typés
// (marche_id + type_marche_valeur_id), pas des colonnes dédiées ici.
@Entity('marche_attributions')
export class MarcheAttribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'marche_id' })
  marcheId: string;

  @Column({ type: 'uuid', name: 'candidat_attributaire_id' })
  candidatAttributaireId: string;

  @Column({ type: 'numeric', name: 'montant_attribue', nullable: true, transformer: numericTransformer })
  montantAttribue: number | null;

  @Column({ type: 'date', name: 'date_attribution', nullable: true })
  dateAttribution: string | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
