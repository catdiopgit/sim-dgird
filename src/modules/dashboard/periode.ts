import dayjs, { type Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(quarterOfYear);

export type PeriodePreset = 'aujourdhui' | 'semaine' | 'mois' | 'trimestre' | 'annee' | 'personnalise';

export interface Periode {
  preset: PeriodePreset;
  debut: Dayjs;
  fin: Dayjs;
}

export const PRESETS_LABEL: Record<Exclude<PeriodePreset, 'personnalise'>, string> = {
  aujourdhui: "Aujourd'hui",
  semaine: 'Cette semaine',
  mois: 'Ce mois',
  trimestre: 'Ce trimestre',
  annee: 'Cette année',
};

export function periodeDepuisPreset(preset: PeriodePreset, debut?: Dayjs, fin?: Dayjs): Periode {
  const maintenant = dayjs();
  switch (preset) {
    case 'aujourdhui':
      return { preset, debut: maintenant.startOf('day'), fin: maintenant.endOf('day') };
    case 'semaine':
      return { preset, debut: maintenant.startOf('week'), fin: maintenant.endOf('week') };
    case 'mois':
      return { preset, debut: maintenant.startOf('month'), fin: maintenant.endOf('month') };
    case 'trimestre':
      return { preset, debut: maintenant.startOf('quarter'), fin: maintenant.endOf('quarter') };
    case 'annee':
      return { preset, debut: maintenant.startOf('year'), fin: maintenant.endOf('year') };
    case 'personnalise':
      return { preset, debut: debut ?? maintenant.startOf('month'), fin: fin ?? maintenant.endOf('day') };
  }
}

// Période précédente de même durée, utilisée pour calculer l'évolution
// (§10 du brief) : jamais de comparaison inventée, uniquement décalée d'une
// durée identique à la période sélectionnée.
export function periodePrecedente(periode: Periode): { debut: Dayjs; fin: Dayjs } {
  const dureeJours = periode.fin.diff(periode.debut, 'day') + 1;
  return {
    debut: periode.debut.subtract(dureeJours, 'day'),
    fin: periode.debut.subtract(1, 'day').endOf('day'),
  };
}

export function formatDate(d: Dayjs): string {
  return d.format('YYYY-MM-DD');
}
