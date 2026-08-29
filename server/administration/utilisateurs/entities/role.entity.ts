import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UtilisateurRole } from './utilisateur-role.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id', nullable: true })
  organisationId: string | null;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text' })
  libelle: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  systeme: boolean;

  @OneToMany(() => UtilisateurRole, (ur) => ur.role)
  utilisateurRoles: UtilisateurRole[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
