import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

export type StatutClotureMarche = 'en_cours' | 'cloture';

@Entity('marches')
export class Marche {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'entite_id' })
  entiteId: string;

  @Column({ type: 'text' })
  reference: string;

  @Column({ type: 'text' })
  objet: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', name: 'type_marche_id' })
  typeMarcheId: string;

  @Column({ type: 'uuid', name: 'responsable_id', nullable: true })
  responsableId: string | null;

  @Column({ type: 'date', name: 'date_debut_prevue', nullable: true })
  dateDebutPrevue: string | null;

  @Column({ type: 'date', name: 'date_fin_prevue', nullable: true })
  dateFinPrevue: string | null;

  @Column({ type: 'numeric', name: 'montant_estimatif', nullable: true, transformer: numericTransformer })
  montantEstimatif: number | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  // Pas de champ de statut libre : le statut affiché (à venir / en cours /
  // en retard / terminé) est entièrement calculé (MarchesService, à partir de
  // statutCloture et de l'agrégation des statuts de phases), jamais saisi ni
  // stocké — élimine tout risque d'incohérence entre statut affiché et dates
  // réelles. Pas de workflow de clôture à 2 niveaux comme Projets (non demandé
  // par le cahier des charges §24 pour ce module) : simple bascule via
  // MarchesService.cloturer, réservée à la permission marches/valider.
  @Column({
    type: 'enum',
    enum: ['en_cours', 'cloture'],
    enumName: 'statut_cloture_marche',
    name: 'statut_cloture',
    default: 'en_cours',
  })
  statutCloture: StatutClotureMarche;

  @Column({ type: 'uuid', name: 'cloture_par', nullable: true })
  cloturePar: string | null;

  @Column({ type: 'timestamptz', name: 'cloture_le', nullable: true })
  clotureLe: Date | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
