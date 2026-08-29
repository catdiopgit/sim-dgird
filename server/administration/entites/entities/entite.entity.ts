import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// La colonne `chemin` (ltree, hiérarchie des entités) n'est volontairement pas
// mappée ici : TypeORM n'a pas de support natif du type ltree, et son seul
// usage est l'opérateur d'ascendance `@>` dans AuthorizationService, exécuté
// en SQL brut (voir server/administration/permissions/authorization.service.ts).
@Entity('entites')
export class Entite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'parent_entite_id', nullable: true })
  parentEntiteId: string | null;

  @Column({ type: 'uuid', name: 'type_entite_id' })
  typeEntiteId: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text' })
  libelle: string;

  @Column({ type: 'text', nullable: true })
  sigle: string | null;

  @Column({ type: 'uuid', name: 'responsable_utilisateur_id', nullable: true })
  responsableUtilisateurId: string | null;

  @Column({ type: 'uuid', name: 'personne_receptrice_id', nullable: true })
  personneReceptriceId: string | null;

  @Column({ type: 'int', default: 0 })
  niveau: number;

  @Column({ type: 'int', default: 0 })
  ordre: number;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
