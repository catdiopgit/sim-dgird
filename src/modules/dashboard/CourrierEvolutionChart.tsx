import type { Dayjs } from 'dayjs';
import { useMemo } from 'react';
import { EvolutionBarres } from '../../components/stats/EvolutionBarres';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import type { StatistiquesCourrierEvolutionPoint } from '../../services/courrier/statistiques';
import { serieEvolution, type Granularite } from '../../utils/serieEvolution';

interface Props {
  evolution: StatistiquesCourrierEvolutionPoint[] | undefined;
  debut: Dayjs;
  fin: Dayjs;
  chargement: boolean;
}

const LIBELLE_GRANULARITE: Record<Granularite, string> = { jour: 'par jour', semaine: 'par semaine', mois: 'par mois' };

export function CourrierEvolutionChart({ evolution, debut, fin, chargement }: Props) {
  const { granularite, serie } = useMemo(() => serieEvolution(evolution ?? [], debut, fin), [evolution, debut, fin]);
  const total = serie.reduce((s, p) => s + p.total, 0);
  const ouvres = serie.filter((p) => !p.weekend);
  const moyenne = ouvres.length ? ouvres.reduce((s, p) => s + p.total, 0) / ouvres.length : 0;

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <div>
          <CardTitle>Courriers enregistrés {LIBELLE_GRANULARITE[granularite]}</CardTitle>
          <CardDescription>
            Tous sens confondus · <span className="tabular-nums">{total}</span> sur la période
            {granularite === 'jour' && ' · week-ends atténués'}
          </CardDescription>
        </div>
        {total > 0 && (
          <span className="hidden shrink-0 items-center gap-2 text-[12px] text-muted-foreground sm:inline-flex">
            <span className="w-4 border-t-2 border-dashed border-gold" />
            Moyenne {moyenne.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
            {granularite === 'jour' ? ' / jour ouvré' : ''}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {chargement ? (
          <Skeleton className="h-[240px] w-full" />
        ) : total === 0 ? (
          <div className="grid h-[240px] place-items-center text-[13px] text-muted-foreground">Aucun courrier sur la période</div>
        ) : (
          <EvolutionBarres serie={serie} granularite={granularite} unite={['courrier', 'courriers']} moyenne={moyenne} />
        )}
      </CardContent>
    </Card>
  );
}
