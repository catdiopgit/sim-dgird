import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SensCourrier = 'entrant' | 'sortant' | 'interne';

@Entity('courriers')
export class Courrier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'enum', enum: ['entrant', 'sortant', 'interne'], enumName: 'sens_courrier' })
  sens: SensCourrier;

  // Généré par ParametrageService.genererNumero (portage de app.fn_generer_numero,
  // 0040), jamais saisi directement par l'appelant.
  @Column({ type: 'text' })
  numero: string;

  @Column({ type: 'uuid', name: 'type_valeur_id', nullable: true })
  typeValeurId: string | null;

  @Column({ type: 'uuid', name: 'priorite_valeur_id', nullable: true })
  prioriteValeurId: string | null;

  @Column({ type: 'uuid', name: 'confidentialite_valeur_id', nullable: true })
  confidentialiteValeurId: string | null;

  @Column({ type: 'uuid', name: 'mode_transmission_valeur_id', nullable: true })
  modeTransmissionValeurId: string | null;

  @Column({ type: 'uuid', name: 'expediteur_type_valeur_id', nullable: true })
  expediteurTypeValeurId: string | null;

  @Column({ type: 'uuid', name: 'statut_reception_valeur_id', nullable: true })
  statutReceptionValeurId: string | null;

  @Column({ type: 'text' })
  objet: string;

  @Column({ type: 'date', name: 'date_courrier' })
  dateCourrier: string;

  @Column({ type: 'timestamptz', name: 'date_reception', nullable: true })
  dateReception: Date | null;

  @Column({ type: 'timestamptz', name: 'date_envoi', nullable: true })
  dateEnvoi: Date | null;

  // Dénormalisé depuis contacts.nom quand expediteur_contact_id est renseigné
  // (CourriersService.creerCourrier), sinon saisie libre.
  @Column({ type: 'text', name: 'expediteur_nom', nullable: true })
  expediteurNom: string | null;

  @Column({ type: 'uuid', name: 'expediteur_contact_id', nullable: true })
  expediteurContactId: string | null;

  @Column({ type: 'text', name: 'destinataire_texte', nullable: true })
  destinataireTexte: string | null;

  @Column({ type: 'uuid', name: 'entite_destinataire_id', nullable: true })
  entiteDestinataireId: string | null;

  // Renseigné par CourrierWorkflowService.imputerCourrier.
  @Column({ type: 'uuid', name: 'agent_destinataire_id', nullable: true })
  agentDestinataireId: string | null;

  @Column({ type: 'uuid', name: 'contact_destinataire_id', nullable: true })
  contactDestinataireId: string | null;

  @Column({ type: 'text', name: 'reference_expediteur', nullable: true })
  referenceExpediteur: string | null;

  @Column({ type: 'uuid', name: 'redacteur_id', nullable: true })
  redacteurId: string | null;

  @Column({ type: 'uuid', name: 'workflow_instance_id', nullable: true })
  workflowInstanceId: string | null;

  // Dénormalisés — maintenus par le trigger SQL app.sync_etape_cache (catégorie 1)
  // sur chaque INSERT dans workflow_historique. CourriersService.creerCourrier les
  // écrit une seule fois explicitement à la création, car le trigger n'a pas encore
  // pu s'exécuter (le courrier n'existe pas au moment du fn_demarrer_workflow interne).
  @Column({ type: 'text', name: 'etape_code', nullable: true })
  etapeCode: string | null;

  @Column({ type: 'text', name: 'etape_libelle', nullable: true })
  etapeLibelle: string | null;

  @Column({ type: 'uuid', name: 'courrier_parent_id', nullable: true })
  courrierParentId: string | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  // Verrouillage post-décharge (fn_ajouter_decharge_courrier / fn_deverrouiller_courrier) —
  // colonnes portées maintenant pour CourriersService.assertWritable, logique de
  // décharge elle-même différée avec le sous-système de stockage (voir MIGRATION.md).
  @Column({ type: 'timestamptz', name: 'verrouille_le', nullable: true })
  verrouilleLe: Date | null;

  @Column({ type: 'uuid', name: 'verrouille_par', nullable: true })
  verrouillePar: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'supprime_le', nullable: true })
  supprimeLe: Date | null;
}
