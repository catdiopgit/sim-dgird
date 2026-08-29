import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('parametres_smtp')
export class ParametreSmtp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'text' })
  hote: string;

  @Column({ type: 'int', default: 587 })
  port: number;

  @Column({ type: 'text', default: 'tls' })
  securite: string;

  @Column({ type: 'text' })
  utilisateur: string;

  // Jamais chargé par défaut (équivalent du `revoke select (mot_de_passe)` d'origine) —
  // seul le service d'envoi SMTP (Phase 7) doit le lire explicitement.
  @Column({ type: 'text', name: 'mot_de_passe', select: false })
  motDePasse: string;

  @Column({ type: 'text', name: 'adresse_expediteur' })
  adresseExpediteur: string;

  @Column({ type: 'text', name: 'nom_expediteur', nullable: true })
  nomExpediteur: string | null;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy: string | null;
}
