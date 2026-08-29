import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('actions')
export class Action {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text' })
  libelle: string;
}
