import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';

export interface KpiEvolution {
  pourcentage: number;
  // Le sens métier n'est jamais déduit automatiquement du signe (§10 du
  // brief) : c'est l'appelant qui sait si une hausse est bonne ou mauvaise
  // pour cet indicateur précis (ex: hausse des retards = négatif).
  sensPositif: boolean | null;
}

export interface KpiSousValeur {
  libelle: string;
  valeur: number;
  ton?: 'critique' | 'succes';
  onClick?: () => void;
}

interface Props {
  icone: ReactNode;
  titre: string;
  valeur: number | string | null;
  suffixe?: string;
  sousValeurs?: KpiSousValeur[];
  evolution?: KpiEvolution | null;
  tendance?: number[];
  onClick?: () => void;
  chargement?: boolean;
}

function Sparkline({ valeurs }: { valeurs: number[] }) {
  if (valeurs.length < 2) return null;
  const w = 96;
  const h = 32;
  const max = Math.max(...valeurs, 1);
  const points = valeurs.map((v, i) => [i * (w / (valeurs.length - 1)), h - 3 - (v / max) * (h - 6)]);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill="var(--chart-1-soft)" />
      <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function KpiCard({ icone, titre, valeur, suffixe, sousValeurs, evolution, tendance, onClick, chargement }: Props) {
  if (chargement) {
    return (
      <div className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const indisponible = valeur === null;
  const EvolutionIcone = !evolution || evolution.pourcentage === 0 ? Minus : evolution.pourcentage > 0 ? TrendingUp : TrendingDown;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 text-left',
        onClick && 'cursor-pointer transition hover:border-input hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ring',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground [&_svg]:size-4">{icone}</span>
          <span className="text-[13px] font-medium">{titre}</span>
        </div>
        {evolution && !indisponible && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums',
              evolution.pourcentage === 0 || evolution.sensPositif === null
                ? 'bg-muted text-muted-foreground'
                : evolution.sensPositif
                  ? 'bg-good/10 text-good-text'
                  : 'bg-crit/10 text-crit-text',
            )}
            title="Évolution par rapport à la période précédente de même durée"
          >
            <EvolutionIcone className="size-3.5" />
            {evolution.pourcentage > 0 ? '+' : ''}
            {evolution.pourcentage.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        {indisponible ? (
          <div>
            <div className="text-[32px] font-semibold leading-none text-muted-foreground">—</div>
            <div className="mt-1.5 text-[12px] text-muted-foreground">Données indisponibles</div>
          </div>
        ) : (
          <div>
            <div className="text-[32px] font-semibold leading-none">
              {valeur}
              {suffixe}
            </div>
            <div className="mt-1.5 text-[12px] text-muted-foreground">
              sur la période
            </div>
          </div>
        )}
        {tendance && !indisponible && <Sparkline valeurs={tendance} />}
      </div>

      {sousValeurs && sousValeurs.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[12px]">
          {sousValeurs.map((sv) => (
            <span
              key={sv.libelle}
              onClick={(e) => {
                if (sv.onClick) {
                  e.stopPropagation();
                  sv.onClick();
                }
              }}
              className={cn('text-muted-foreground', sv.onClick && 'cursor-pointer underline-offset-2 hover:underline')}
            >
              {sv.libelle}{' '}
              <b
                className={cn(
                  'font-semibold tabular-nums text-foreground',
                  sv.ton === 'critique' && sv.valeur > 0 && 'text-crit-text',
                  sv.ton === 'succes' && 'text-good-text',
                )}
              >
                {sv.valeur}
              </b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
