import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('projet_membres')
export class ProjetMembre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'projet_id' })
  projetId: string;

  @Column({ type: 'uuid', name: 'utilisateur_id' })
  utilisateurId: string;

  @Column({ type: 'uuid', name: 'role_equipe_valeur_id', nullable: true })
  roleEquipeValeurId: string | null;

  @Column({ type: 'date', name: 'date_ajout' })
  dateAjout: string;

  @Column({ type: 'date', name: 'date_retrait', nullable: true })
  dateRetrait: string | null;

  // §4 (0065) : un membre "lecteur" (false) peut consulter mais pas écrire —
  // ProjetsService.canModifier s'appuie sur cette colonne.
  @Column({ type: 'boolean', name: 'peut_modifier' })
  peutModifier: boolean;
}
