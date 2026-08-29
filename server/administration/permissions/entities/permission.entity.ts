import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PorteePermission = 'organisation' | 'entite' | 'entite_et_descendants' | 'personnel';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId: string;

  @Column({ type: 'uuid', name: 'module_id' })
  moduleId: string;

  @Column({ type: 'uuid', name: 'action_id' })
  actionId: string;

  // enumName doit correspondre exactement au type Postgres existant (créé par les
  // migrations SQL d'origine) — sans ça TypeORM tente de créer/référencer son propre
  // type généré et les casts d'INSERT/UPDATE échouent.
  @Column({
    type: 'enum',
    enum: ['organisation', 'entite', 'entite_et_descendants', 'personnel'],
    enumName: 'portee_permission',
    default: 'organisation',
  })
  portee: PorteePermission;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
