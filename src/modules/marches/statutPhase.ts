import type { StatutCalculePhase } from '../../services/marches/phasesMarche';

// §13 : statuts "clairement identifiables" — calculés côté serveur
// (PhasesMarcheService.calculerStatut), simplement libellés/colorés ici.
export const LIBELLES_STATUT_PHASE: Record<StatutCalculePhase, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  en_retard: 'En retard',
  realisee_a_temps: 'Réalisée dans les délais',
  realisee_avance: 'Réalisée en avance',
  realisee_retard: 'Réalisée en retard',
};

export const COULEURS_STATUT_PHASE: Record<StatutCalculePhase, string> = {
  a_venir: 'default',
  en_cours: 'blue',
  en_retard: 'red',
  realisee_a_temps: 'green',
  realisee_avance: 'cyan',
  realisee_retard: 'orange',
};
