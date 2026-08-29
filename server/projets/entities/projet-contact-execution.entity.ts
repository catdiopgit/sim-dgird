import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// §4 (0072) : personne de l'organisme chargé d'exécuter le projet (consultant,
// entreprise...) sans compte SIM — vivier pour livrables.responsable_contact_id
// et projets.charge_execution_contact_id.
@Entity('projet_contacts_execution')
export class ProjetContactExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projet_id' })
  projetId: string;

  @Column({ type: 'text' })
  nom: string;

  @Column({ type: 'text', nullable: true })
  fonction: string | null;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  telephone: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
