import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// projet_id/livrable_id/avenant_id/decaissement_id/mission_id/type_projet_valeur_id :
// colonnes ajoutées par les migrations Projets v3/Missions (0072+/0077), hors périmètre
// tant que ces modules n'existent pas côté NestJS (Phases 5/6) — mappées mais toujours
// nulles pour tout document créé par ce module.
@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  // Nullable depuis 0068 (Projets/Missions peuvent attacher un document sans
  // versement) ; toujours renseigné pour un document créé via GedDocumentsService.
  @Column({ type: 'uuid', name: 'versement_id', nullable: true })
  versementId: string | null;

  @Column({ type: 'uuid', name: 'dossier_id', nullable: true })
  dossierId: string | null;

  // Vestigial (voir GedDossier.categorieId).
  @Column({ type: 'uuid', name: 'categorie_id', nullable: true })
  categorieId: string | null;

  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'uuid', name: 'projet_id', nullable: true })
  projetId: string | null;

  @Column({ type: 'uuid', name: 'livrable_id', nullable: true })
  livrableId: string | null;

  @Column({ type: 'uuid', name: 'avenant_id', nullable: true })
  avenantId: string | null;

  @Column({ type: 'uuid', name: 'decaissement_id', nullable: true })
  decaissementId: string | null;

  @Column({ type: 'uuid', name: 'mission_id', nullable: true })
  missionId: string | null;

  @Column({ type: 'uuid', name: 'type_projet_valeur_id', nullable: true })
  typeProjetValeurId: string | null;

  @Column({ type: 'text' })
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // jamais lu/écrit par aucune des fonctions portées — mappé pour fidélité de
  // schéma seulement.
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'text', array: true, name: 'mots_cles', default: '{}' })
  motsCles: string[];

  @Column({ type: 'uuid', name: 'version_courante_id', nullable: true })
  versionCouranteId: string | null;

  // Code de liste 'courrier_confidentialite' — partagée avec Courrier, pas une
  // liste GED dédiée.
  @Column({ type: 'uuid', name: 'confidentialite_valeur_id', nullable: true })
  confidentialiteValeurId: string | null;

  @Column({ type: 'int', name: 'duree_conservation_mois', nullable: true })
  dureeConservationMois: number | null;

  @Column({ type: 'timestamptz', name: 'date_versement' })
  dateVersement: Date;

  // Maintenu par le trigger SQL app.sync_etape_cache (catégorie 1) — posé une
  // seule fois quand le versement porteur atteint une étape type_etape='finale'.
  @Column({ type: 'timestamptz', name: 'date_archivage', nullable: true })
  dateArchivage: Date | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'supprime_le', nullable: true })
  supprimeLe: Date | null;
}
