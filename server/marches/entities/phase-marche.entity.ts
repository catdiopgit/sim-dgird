import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { UniteDureePhase } from './phase-type-marche.entity';

// Phase d'un marché donné, instanciée depuis PhaseTypeMarche à la création du
// marché (ou à la (re)planification déclenchée par un changement de date de
// début) — voir PhasesMarcheService.planifier. Dates prévisionnelles calculées
// automatiquement (§10) ; dates réelles saisies à l'exécution (§11). Aucun
// statut n'est stocké : "à venir / en cours / en retard / réalisée (à temps /
// en avance / en retard)" (§13) sont entièrement calculés à la lecture
// (PhasesMarcheService.calculerStatut) à partir des 4 dates ci-dessus et de la
// date du jour — dateDebutReelle/dateFinReelle renseignées = phase démarrée/
// validée (§12). Reste toujours cohérent avec "aujourd'hui" sans job de
// rafraîchissement ni risque de statut périmé.
@Entity('phases_marche')
export class PhaseMarche {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'marche_id' })
  marcheId: string;

  @Column({ type: 'uuid', name: 'phase_type_marche_id', nullable: true })
  phaseTypeMarcheId: string | null;

  @Column({ type: 'text' })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  ordre: number;

  @Column({ type: 'int', name: 'duree_prevue' })
  dureePrevue: number;

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

  @Column({ type: 'date', name: 'date_debut_prevue', nullable: true })
  dateDebutPrevue: string | null;

  @Column({ type: 'date', name: 'date_fin_prevue', nullable: true })
  dateFinPrevue: string | null;

  @Column({ type: 'date', name: 'date_debut_reelle', nullable: true })
  dateDebutReelle: string | null;

  @Column({ type: 'date', name: 'date_fin_reelle', nullable: true })
  dateFinReelle: string | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
