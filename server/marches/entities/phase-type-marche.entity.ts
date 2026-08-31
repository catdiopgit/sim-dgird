import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type UniteDureePhase = 'jour' | 'semaine' | 'mois';

// Phase-modèle d'un type de marché (§7) : nom, ordre, durée prévue et
// caractère obligatoire/optionnel. Dupliquée en PhaseMarche (avec dates
// calculées) à chaque création de marché de ce type — voir
// PhasesMarcheService.planifier.
@Entity('phases_type_marche')
export class PhaseTypeMarche {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'type_marche_id' })
  typeMarcheId: string;

  @Column({ type: 'text' })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  ordre: number;

  @Column({ type: 'int', default: 1 })
  duree: number;

  @Column({
    type: 'enum',
    enum: ['jour', 'semaine', 'mois'],
    enumName: 'unite_duree_phase',
    name: 'unite_duree',
    default: 'jour',
  })
  uniteDuree: UniteDureePhase;

  @Column({ type: 'boolean', default: true })
  obligatoire: boolean;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
