import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UtilisateurRole } from './utilisateur-role.entity';

// organisation_id / entite_id / fonction_id restent de simples colonnes (pas de
// relation TypeORM) tant que les entités Organisation/Entite/Fonction n'ont pas
// été créées (Phase 1, suite) — voir MIGRATION.md.
@Entity('utilisateurs')
export class Utilisateur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'entite_id', nullable: true })
  entiteId: string | null;

  @Column({ type: 'text', nullable: true })
  matricule: string | null;

  @Column({ type: 'text' })
  nom: string;

  @Column({ type: 'text' })
  prenom: string;

  @Column({ type: 'text', unique: true })
  email: string;

  // Ajoutée pour l'auth JWT native (absente du schéma Supabase d'origine, où
  // le mot de passe était géré par GoTrue dans auth.users). Nullable tant que
  // la bascule bcrypt (server/scripts/migrate-passwords.ts) n'a pas tourné.
  @Column({ type: 'text', name: 'password_hash', nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'text', nullable: true })
  telephone: string | null;

  @Column({ type: 'uuid', name: 'fonction_id', nullable: true })
  fonctionId: string | null;

  @Column({ type: 'text', name: 'photo_url', nullable: true })
  photoUrl: string | null;

  @Column({ type: 'text', default: 'actif' })
  statut: string;

  // v8.6.5 — sécurité des comptes : changement obligatoire du mot de passe
  // (création, réinitialisation), verrouillage après échecs répétés.
  @Column({ type: 'boolean', name: 'doit_changer_mot_de_passe', default: false })
  doitChangerMotDePasse: boolean;

  @Column({ type: 'int', name: 'echecs_connexion', default: 0, select: false })
  echecsConnexion: number;

  @Column({ type: 'timestamptz', name: 'verrouille_jusqua', nullable: true })
  verrouilleJusqua: Date | null;

  @Column({ type: 'timestamptz', name: 'mot_de_passe_modifie_le', nullable: true })
  motDePasseModifieLe: Date | null;

  @Column({ type: 'date', name: 'date_entree', nullable: true })
  dateEntree: string | null;

  @OneToMany(() => UtilisateurRole, (ur) => ur.utilisateur)
  utilisateurRoles: UtilisateurRole[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
