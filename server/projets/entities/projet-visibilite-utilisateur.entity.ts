import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('projet_visibilite_utilisateurs')
export class ProjetVisibiliteUtilisateur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projet_id' })
  projetId: string;

  @Column({ type: 'uuid', name: 'utilisateur_id' })
  utilisateurId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
