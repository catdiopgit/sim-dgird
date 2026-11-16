import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { TypeActionCourrier } from '../../workflow/entities/workflow-transition.entity';

export type TypeDiffusionCourrier = 'principal' | 'copie';

@Entity('courrier_destinataires')
export class CourrierDestinataire {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'courrier_id' })
  courrierId: string;

  // CHECK côté SQL : entite_id, utilisateur_id ou contact_id doit être renseigné.
  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'uuid', name: 'utilisateur_id', nullable: true })
  utilisateurId: string | null;

  @Column({ type: 'uuid', name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({
    type: 'enum',
    enum: ['principal', 'copie'],
    enumName: 'type_diffusion_courrier',
    name: 'type_diffusion',
    default: 'principal',
  })
  typeDiffusion: TypeDiffusionCourrier;

  @Column({ type: 'timestamptz', name: 'date_prise_connaissance', nullable: true })
  datePriseConnaissance: Date | null;

  @Column({ type: 'text', nullable: true })
  instruction: string | null;

  @Column({ type: 'date', nullable: true })
  echeance: string | null;

  @Column({
    type: 'enum',
    enum: ['imputation', 'affectation', 'transmission', 'redirection'],
    enumName: 'type_action_courrier',
    name: 'type_action',
    nullable: true,
  })
  typeAction: TypeActionCourrier | null;

  // Corrèle ce destinataire à la ligne d'historique de workflow que son imputation
  // a déclenchée (CourrierWorkflowService.imputerCourrier).
  @Column({ type: 'uuid', name: 'workflow_historique_id', nullable: true })
  workflowHistoriqueId: string | null;

  // Note de service : 'responsable' (défaut), 'entite' (tout le personnel) ou
  // 'entite_et_descendants'. Les lignes nominatives générées à la diffusion
  // pointent vers la ligne d'entité via destinataire_parent_id (SQL v8.1).
  @Column({ type: 'text', name: 'portee_diffusion', nullable: true })
  porteeDiffusion: 'responsable' | 'entite' | 'entite_et_descendants' | null;

  @Column({ type: 'uuid', name: 'destinataire_parent_id', nullable: true })
  destinataireParentId: string | null;
}
