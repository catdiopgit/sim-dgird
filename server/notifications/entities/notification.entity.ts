import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type CanalNotification = 'in_app' | 'email' | 'sms' | 'push';

// objet_module/objet_id sont volontairement polymorphes (pas de FK) — pointent vers
// une ligne d'un module métier (courrier/ged/missions), voir app.fn_notifier_transition
// (trigger, reste en SQL) et NotificationsService.notifier.
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'destinataire_id' })
  destinataireId: string;

  @Column({ type: 'uuid', name: 'module_id', nullable: true })
  moduleId: string | null;

  @Column({ type: 'uuid', name: 'type_valeur_id', nullable: true })
  typeValeurId: string | null;

  @Column({ type: 'text' })
  titre: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'text', name: 'objet_module', nullable: true })
  objetModule: string | null;

  @Column({ type: 'uuid', name: 'objet_id', nullable: true })
  objetId: string | null;

  @Column({ type: 'text', name: 'lien_url', nullable: true })
  lienUrl: string | null;

  @Column({ type: 'boolean', default: false })
  lu: boolean;

  @Column({ type: 'timestamptz', name: 'lu_le', nullable: true })
  luLe: Date | null;

  @Column({
    type: 'enum',
    enum: ['in_app', 'email', 'sms', 'push'],
    enumName: 'canal_notification',
    default: 'in_app',
  })
  canal: CanalNotification;

  @Column({ type: 'timestamptz', name: 'envoye_le', nullable: true })
  envoyeLe: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
