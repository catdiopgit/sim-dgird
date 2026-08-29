import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Utilisateur } from './utilisateur.entity';
import { Role } from './role.entity';

@Entity('utilisateur_roles')
export class UtilisateurRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'utilisateur_id' })
  utilisateurId: string;

  @ManyToOne(() => Utilisateur, (u) => u.utilisateurRoles)
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId: string;

  @ManyToOne(() => Role, (r) => r.utilisateurRoles)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  // Portée facultative de l'attribution (rôle valable uniquement sur cette entité) ;
  // relation Entite ajoutée quand le module Entités existera (Phase 1, suite).
  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'date', name: 'date_debut' })
  dateDebut: string;

  @Column({ type: 'date', name: 'date_fin', nullable: true })
  dateFin: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
