import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// CHECK SQL : document_id is not null or storage_path is not null. Le port
// NestJS ne renseigne jamais document_id (lien croisé GED, Phase 4) — storage_path
// est donc toujours renseigné ici. `storage_path` signifiait un chemin d'objet
// Supabase Storage à l'origine ; il porte maintenant un chemin relatif sous
// STORAGE_ROOT (décision d, disque local) — même convention
// `{courrier_id}/{uuid}-{nom_fichier_assaini}` qu'avant, voir CourrierStorageService.
@Entity('courrier_pieces_jointes')
export class CourrierPieceJointe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'courrier_id' })
  courrierId: string;

  @Column({ type: 'uuid', name: 'document_id', nullable: true })
  documentId: string | null;

  @Column({ type: 'text', name: 'storage_path', nullable: true })
  storagePath: string | null;

  @Column({ type: 'text', name: 'nom_fichier' })
  nomFichier: string;

  // bigint Postgres -> string par défaut côté driver pg ; transformer vers number
  // (sûr jusqu'à 2^53 octets, très au-delà de toute pièce jointe réelle).
  @Column({
    type: 'bigint',
    name: 'taille_octets',
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  tailleOctets: number | null;

  @Column({ type: 'text', name: 'type_mime', nullable: true })
  typeMime: string | null;

  @Column({ type: 'boolean', name: 'est_scan', default: false })
  estScan: boolean;

  // true uniquement pour la pièce jointe posée par
  // CourrierStorageService.ajouterDecharge — verrouille le courrier.
  @Column({ type: 'boolean', name: 'est_decharge', default: false })
  estDecharge: boolean;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
