import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// ACL par document. CHECK SQL : exactement une des trois colonnes cible doit être
// renseignée (revalidé côté service, GedDroitsService.validerCible — le SQL
// d'origine ne se protège pas lui-même, laisse juste la contrainte échouer).
// Seule l'action 'consulter' est aujourd'hui exploitée par une lecture quelconque
// (voir GedDocumentsService.canView) ; un droit 'modifier' est acceptable côté
// schéma mais n'a actuellement aucun effet (aucune fonction source ne le lit).
@Entity('document_droits')
export class DocumentDroit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'document_id' })
  documentId: string;

  @Column({ type: 'uuid', name: 'role_id', nullable: true })
  roleId: string | null;

  @Column({ type: 'uuid', name: 'utilisateur_id', nullable: true })
  utilisateurId: string | null;

  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'uuid', name: 'action_id' })
  actionId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
