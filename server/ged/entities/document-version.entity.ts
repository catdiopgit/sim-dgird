import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'document_id' })
  documentId: string;

  // Calculé par GedDocumentsService.verserVersion (max+1 par document, pas de
  // verrou FOR UPDATE côté SQL d'origine — fidèlement reproduit, voir le
  // commentaire dans le service).
  @Column({ type: 'int', name: 'version_majeure', default: 1 })
  versionMajeure: number;

  // Toujours 0 en pratique : aucune fonction ne produit de version mineure non nulle.
  @Column({ type: 'int', name: 'version_mineure', default: 0 })
  versionMineure: number;

  @Column({ type: 'text', name: 'storage_path' })
  storagePath: string;

  @Column({ type: 'text', name: 'nom_fichier' })
  nomFichier: string;

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

  @Column({ type: 'text', name: 'hash_sha256', nullable: true })
  hashSha256: string | null;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
