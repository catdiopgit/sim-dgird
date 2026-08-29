import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('mission_participants')
export class MissionParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'mission_id' })
  missionId: string;

  @Column({ type: 'uuid', name: 'utilisateur_id' })
  utilisateurId: string;

  @Column({ type: 'uuid', name: 'role_participant_valeur_id', nullable: true })
  roleParticipantValeurId: string | null;
}
