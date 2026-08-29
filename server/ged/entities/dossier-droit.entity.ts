import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// ACL par dossier — même forme que DocumentDroit, sert de repli quand un
// document n'a pas de droit direct (voir GedDocumentsService.canView, étape 7).
@Entity('dossier_droits')
export class DossierDroit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'dossier_id' })
  dossierId: string;

  @Column({ type: 'uuid', name: 'role_id', nullable: true })
  roleId: string | null;

  @Column({ type: 'uuid', name: 'utilisateur_id', nullable: true })
  utilisateurId: string | null;

  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'uuid', name: 'action_id' })
  actionId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
