import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Actions demandées (multi-sélection sur une liste de valeurs) pour un
// destinataire principal — unique (courrier_destinataire_id, valeur_liste_id).
@Entity('courrier_destinataire_actions')
export class CourrierDestinataireAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'courrier_destinataire_id' })
  courrierDestinataireId: string;

  @Column({ type: 'uuid', name: 'valeur_liste_id' })
  valeurListeId: string;
}
