import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Table `modules` (courrier, ged, projets, missions...) — nommée ModuleFonctionnel
// côté NestJS pour éviter la collision avec le décorateur @Module().
@Entity('modules')
export class ModuleFonctionnel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text' })
  libelle: string;

  @Column({ type: 'text', nullable: true })
  icone: string | null;

  @Column({ type: 'int', default: 0 })
  ordre: number;

  @Column({ type: 'boolean', default: true })
  actif: boolean;
}
