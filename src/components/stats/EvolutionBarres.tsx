import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fr } from '../../utils/dateFr';
import type { Granularite, PointSerie } from '../../utils/serieEvolution';

function libelleAxe(p: PointSerie, g: Granularite) {
  return g === 'mois' ? fr(p.debut).format('MMM YY') : fr(p.debut).format('D MMM');
}

function libelleInfobulle(p: PointSerie, g: Granularite) {
  if (g === 'jour') return fr(p.debut).format('dddd D MMMM');
  if (g === 'semaine') return `Semaine du ${fr(p.debut).format('D MMMM')}`;
  return fr(p.debut).format('MMMM YYYY');
}

// Histogramme d'une série temporelle continue (cf. utils/serieEvolution) :
// une seule teinte (magnitude), week-ends atténués en granularité jour,
// ligne de moyenne optionnelle, infobulle datée.
export function EvolutionBarres({
  serie,
  granularite,
  unite,
  moyenne,
  hauteur = 240,
}: {
  serie: PointSerie[];
  granularite: Granularite;
  unite: [singulier: string, pluriel: string];
  moyenne?: number;
  hauteur?: number;
}) {
  const parCle = useMemo(() => new Map(serie.map((p) => [p.cle, p])), [serie]);

  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={serie} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="cle"
          tickFormatter={(cle: string) => {
            const p = parCle.get(cle);
            return p ? libelleAxe(p, granularite) : '';
          }}
          tick={{ fill: 'var(--axis)', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--axis)' }}
          minTickGap={16}
        />
        <YAxis allowDecimals={false} tick={{ fill: 'var(--axis)', fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={({ active, payload }) => {
            const p = active && (payload?.[0]?.payload as PointSerie | undefined);
            if (!p) return null;
            return (
              <div className="rounded-lg border border-border bg-card px-3 py-2 text-[12px] shadow-lg">
                <div className="mb-0.5 text-muted-foreground first-letter:uppercase">{libelleInfobulle(p, granularite)}</div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-[var(--chart-1)]" />
                  <b className="tabular-nums">{p.total}</b> {p.total > 1 ? unite[1] : unite[0]}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
          {serie.map((p) => (
            <Cell key={p.cle} fill="var(--chart-1)" fillOpacity={p.weekend ? 0.45 : 1} />
          ))}
        </Bar>
        {moyenne !== undefined && moyenne > 0 && (
          <ReferenceLine y={moyenne} stroke="var(--gold)" strokeDasharray="4 4" strokeWidth={1.5} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
