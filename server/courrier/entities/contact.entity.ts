import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TypeContact = 'personne' | 'entreprise' | 'administration';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'text' })
  nom: string;

  // CHECK SQL (personne/entreprise/administration), pas un vrai enum Postgres.
  @Column({ type: 'text', default: 'administration' })
  type: TypeContact;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  telephone: string | null;

  @Column({ type: 'text', nullable: true })
  adresse: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'supprime_le', nullable: true })
  supprimeLe: Date | null;
}
