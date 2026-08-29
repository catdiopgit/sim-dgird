import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

// Schéma V3 (0072/0073) : rattaché directement au projet (plus d'activité/
// phase intermédiaire), pondéré par poids_pct, responsable membre-ou-contact.
// document_id/workflow_instance_id sont des colonnes mortes héritées de 0010
// (jamais lues/écrites par aucune fonction depuis V3) — mappées pour fidélité
// de schéma uniquement, jamais utilisées par ce module.
@Entity('livrables')
export class Livrable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projet_id' })
  projetId: string;

  @Column({ type: 'text' })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', name: 'responsable_utilisateur_id', nullable: true })
  responsableUtilisateurId: string | null;

  @Column({ type: 'uuid', name: 'responsable_contact_id', nullable: true })
  responsableContactId: string | null;

  @Column({ type: 'date', name: 'date_prevue', nullable: true })
  datePrevue: string | null;

  @Column({ type: 'date', name: 'date_remise', nullable: true })
  dateRemise: string | null;

  @Column({ type: 'uuid', name: 'statut_valeur_id', nullable: true })
  statutValeurId: string | null;

  // Quote-part du projet portée par ce livrable — base du calcul automatique
  // de projets.avancement_pct (app.fn_recalculer_avancement_projet, 0073).
  @Column({ type: 'numeric', name: 'poids_pct', transformer: numericTransformer })
  poidsPct: number;

  @Column({ type: 'uuid', name: 'document_id', nullable: true })
  documentId: string | null;

  @Column({ type: 'uuid', name: 'workflow_instance_id', nullable: true })
  workflowInstanceId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
