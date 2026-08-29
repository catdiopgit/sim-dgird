import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// `chemin` (ltree) volontairement pas mappé — trigger SQL app.set_ged_dossier_chemin
// (catégorie 1, même limitation connue que entites.chemin/set_entite_chemin : déplacer
// un sous-arbre ne recalcule pas récursivement le chemin des descendants). `niveau` est
// lui aussi maintenu par ce trigger, mappé en lecture seulement (jamais écrit par le service).
@Entity('ged_dossiers')
export class GedDossier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  // null = dossier transverse (organisation entière).
  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'uuid', name: 'parent_dossier_id', nullable: true })
  parentDossierId: string | null;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text' })
  libelle: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Vestigial : plus aucune fonction ne le renseigne (fn_creer_categorie_ged/
  // fn_modifier_categorie_ged supprimées en 0062). Colonne conservée pour
  // fidélité de schéma, jamais écrite par GedDossiersService.
  @Column({ type: 'uuid', name: 'categorie_id', nullable: true })
  categorieId: string | null;

  @Column({ type: 'int', default: 0 })
  niveau: number;

  @Column({ type: 'text', nullable: true })
  icone: string | null;

  @Column({ type: 'text', nullable: true })
  couleur: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'supprime_le', nullable: true })
  supprimeLe: Date | null;
}
