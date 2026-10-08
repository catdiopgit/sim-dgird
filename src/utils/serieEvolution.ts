import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export type Granularite = 'jour' | 'semaine' | 'mois';

export interface PointSerie {
  cle: string;
  debut: Dayjs;
  total: number;
  weekend: boolean;
}

// fn_statistiques_courrier ne renvoie que les jours ayant au moins un courrier :
// on reconstruit une série continue (jours vides = 0) bornée à aujourd'hui,
// regroupée par semaine ou par mois quand la période est longue.
export function serieEvolution(
  points: { date: string; total: number }[],
  debut: Dayjs,
  fin: Dayjs,
  plafonnerAujourdhui = true,
): { granularite: Granularite; serie: PointSerie[] } {
  const borneFin = plafonnerAujourdhui && fin.isAfter(dayjs()) ? dayjs().endOf('day') : fin;
  const jours = borneFin.diff(debut, 'day') + 1;
  const granularite: Granularite = jours <= 45 ? 'jour' : jours <= 200 ? 'semaine' : 'mois';
  const unite = granularite === 'jour' ? 'day' : granularite === 'semaine' ? 'isoWeek' : 'month';

  const totaux = new Map<string, number>();
  for (const p of points) {
    const cle = dayjs(p.date).startOf(unite).format('YYYY-MM-DD');
    totaux.set(cle, (totaux.get(cle) ?? 0) + p.total);
  }

  const serie: PointSerie[] = [];
  for (let d = debut.startOf(unite); !d.isAfter(borneFin); d = d.add(1, granularite === 'semaine' ? 'week' : granularite === 'mois' ? 'month' : 'day')) {
    const cle = d.format('YYYY-MM-DD');
    serie.push({ cle, debut: d, total: totaux.get(cle) ?? 0, weekend: granularite === 'jour' && (d.day() === 0 || d.day() === 6) });
  }
  return { granularite, serie };
}
