import { create } from 'zustand';
import { periodeDepuisPreset, type Periode } from './periode';

interface PeriodeStore {
  periode: Periode;
  setPeriode: (periode: Periode) => void;
}

// La période du tableau de bord est choisie dans le header global (AppShell)
// et lue par DashboardPage : un store partagé remplace l'ancien useState local,
// la logique de calcul (periode.ts) reste inchangée.
export const usePeriodeStore = create<PeriodeStore>((set) => ({
  periode: periodeDepuisPreset('mois'),
  setPeriode: (periode) => set({ periode }),
}));
