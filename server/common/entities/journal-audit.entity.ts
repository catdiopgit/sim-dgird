import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Table générique alimentée par le trigger SQL app.fn_audit_trigger (catégorie 1,
// reste en SQL) sur courriers/parametres_organisation/etc. — lecture seule côté
// NestJS, aucun INSERT applicatif hormis les entrées synthétiques ponctuelles
// (ex. CourrierWorkflowService.deverrouillerCourrier, une fois porté).
@Entity('journal_audit')
export class JournalAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'utilisateur_id', nullable: true })
  utilisateurId: string | null;

  @Column({ type: 'uuid', name: 'organisation_id', nullable: true })
  organisationId: string | null;

  @Column({ type: 'uuid', name: 'module_id', nullable: true })
  moduleId: string | null;

  @Column({ type: 'uuid', name: 'action_id', nullable: true })
  actionId: string | null;

  @Column({ type: 'text', name: 'objet_type' })
  objetType: string;

  @Column({ type: 'uuid', name: 'objet_id', nullable: true })
  objetId: string | null;

  @Column({ type: 'jsonb', name: 'ancienne_valeur', nullable: true })
  ancienneValeur: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'nouvelle_valeur', nullable: true })
  nouvelleValeur: Record<string, unknown> | null;

  @Column({ type: 'text', name: 'adresse_ip', nullable: true })
  adresseIp: string | null;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
