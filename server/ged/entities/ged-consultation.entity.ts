import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TypeAccesGed = 'consultation' | 'telechargement';

// Journal d'accès append-only — écriture réservée à
// GedConsultationsService.tracer{Consultation,Telechargement} (REVOKE
// insert/update/delete côté SQL pour authenticated, comme workflow_instances).
@Entity('ged_consultations')
export class GedConsultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'document_id' })
  documentId: string;

  @Column({ type: 'uuid', name: 'utilisateur_id', nullable: true })
  utilisateurId: string | null;

  // CHECK SQL ('consultation'|'telechargement'), pas un vrai enum Postgres.
  @Column({ type: 'text', name: 'type_acces' })
  typeAcces: TypeAccesGed;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
