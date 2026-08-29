import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Journal d'audit append-only — écriture réservée à WorkflowEngineService, comme
// workflow_instances. Un INSERT ici déclenche les triggers SQL trg_workflow_historique_notifier
// (app.fn_notifier_transition, catégorie 3 mais laissé en trigger, voir WorkflowEngineService)
// et app.sync_etape_cache (catégorie 1, dénormalise etape_code/libelle sur courriers/
// ged_versements/missions) — ils s'exécutent quel que soit le client SQL, TypeORM inclus.
@Entity('workflow_historique')
export class WorkflowHistorique {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workflow_instance_id' })
  workflowInstanceId: string;

  // null sur la ligne de démarrage (aucune transition franchie).
  @Column({ type: 'uuid', name: 'transition_id', nullable: true })
  transitionId: string | null;

  @Column({ type: 'uuid', name: 'etape_precedente_id', nullable: true })
  etapePrecedenteId: string | null;

  @Column({ type: 'uuid', name: 'etape_suivante_id' })
  etapeSuivanteId: string;

  @Column({ type: 'uuid', name: 'utilisateur_id', nullable: true })
  utilisateurId: string | null;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  @CreateDateColumn({ name: 'date_action' })
  dateAction: Date;
}
