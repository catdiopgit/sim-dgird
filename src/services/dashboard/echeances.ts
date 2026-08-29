export type TypeEcheance = 'livrable' | 'action_mission';

export interface EcheanceProchaine {
  type: TypeEcheance;
  id: string;
  libelle: string;
  reference: string;
  dateEcheance: string;
  enRetard: boolean;
  lienId: string;
}

// Catégorie 9 (reporting) : jamais portée côté NestJS — cette fonction lit
// app.current_organisation_id()/app.can_view_projet()/app.can_view_mission(),
// des fonctions de session RLS Supabase absentes une fois RLS désactivée
// (décision b, MIGRATION.md). Voir services/projets/statistiques.ts pour
// l'explication complète.
export async function fetchEcheancesProchaines(_horizonJours = 30): Promise<EcheanceProchaine[]> {
  throw new Error('Les échéances à venir ne sont pas encore portées côté serveur (voir MIGRATION.md).');
}
