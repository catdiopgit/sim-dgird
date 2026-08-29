import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('projet_visibilite_entites')
export class ProjetVisibiliteEntite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projet_id' })
  projetId: string;

  @Column({ type: 'uuid', name: 'entite_id' })
  entiteId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
