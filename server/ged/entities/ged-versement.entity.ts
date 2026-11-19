import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Porte le workflow GED (déplacé hors de `documents` en 0057) — un versement est
// un lot de documents soumis ensemble, l'équivalent GED d'un courrier.
@Entity('ged_versements')
export class GedVersement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  // Classement cible proposé — fn_ajouter_document_versement/fn_classer_document
  // s'en servent comme repli si aucun dossier explicite n'est donné.
  @Column({ type: 'uuid', name: 'dossier_cible_id', nullable: true })
  dossierCibleId: string | null;

  @Column({ type: 'text' })
  objet: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // true = brouillon éditable ; passé à false par GedVersementsService.soumettre.
  // Repassé à true automatiquement par le trigger SQL app.sync_etape_cache quand
  // le workflow atteint une étape type_etape='rejet' ("À corriger").
  @Column({ type: 'boolean', default: true })
  brouillon: boolean;

  @Column({ type: 'uuid', name: 'workflow_instance_id', nullable: true })
  workflowInstanceId: string | null;

  // Dénormalisés, maintenus par app.sync_etape_cache (catégorie 1) — mêmes règles
  // que Courrier (voir Courrier.etapeCode/etapeLibelle).
  @Column({ type: 'text', name: 'etape_code', nullable: true })
  etapeCode: string | null;

  @Column({ type: 'text', name: 'etape_libelle', nullable: true })
  etapeLibelle: string | null;

  @Column({ type: 'uuid', name: 'redacteur_id', nullable: true })
  redacteurId: string | null;

  // v8.6.4 : dates extrêmes des documents versés, code d'archivage saisi par
  // l'archiviste au classement, dossier créé pour le versement, jalons.
  @Column({ type: 'date', name: 'date_debut_extreme', nullable: true })
  dateDebutExtreme: string | null;

  @Column({ type: 'date', name: 'date_fin_extreme', nullable: true })
  dateFinExtreme: string | null;

  @Column({ type: 'text', name: 'code_archivage', nullable: true })
  codeArchivage: string | null;

  @Column({ type: 'uuid', name: 'dossier_versement_id', nullable: true })
  dossierVersementId: string | null;

  @Column({ type: 'timestamptz', name: 'soumis_le', nullable: true })
  soumisLe: Date | null;

  @Column({ type: 'timestamptz', name: 'classe_le', nullable: true })
  classeLe: Date | null;

  @Column({ type: 'timestamptz', name: 'archive_le', nullable: true })
  archiveLe: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // v8.7 : « manuel » ou « automatique » (créé par un lancement de versements automatiques).
  @Column({ type: 'text', default: 'manuel' })
  origine: string;

  @Column({ type: 'uuid', name: 'lancement_id', nullable: true })
  lancementId: string | null;

  @Column({ type: 'timestamptz', name: 'supprime_le', nullable: true })
  supprimeLe: Date | null;
}
