import type { Dayjs } from 'dayjs';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { PlageDates } from '../form/plage-dates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

// Tuile d'indicateur des pages Statistiques. La couleur de statut n'est
// jamais seule : le titre porte le sens (« En retard », « Clôturés »).
export function StatTile({
  titre,
  valeur,
  suffixe,
  detail,
  ton,
  onClick,
  chargement,
}: {
  titre: string;
  valeur: ReactNode;
  suffixe?: string;
  detail?: ReactNode;
  ton?: 'critique' | 'succes';
  onClick?: () => void;
  chargement?: boolean;
}) {
  const Racine = onClick ? 'button' : 'div';
  return (
    <Racine
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex flex-col rounded-xl border border-border bg-card p-4 text-left',
        onClick && 'cursor-pointer transition hover:border-input hover:shadow-sm',
      )}
    >
      <span className="text-[12px] font-medium text-muted-foreground">{titre}</span>
      {chargement ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <span
          className={cn(
            'mt-1.5 text-[24px] font-semibold leading-none tabular-nums',
            ton === 'critique' && 'text-crit-text',
            ton === 'succes' && 'text-good-text',
          )}
        >
          {valeur}
          {suffixe && <span className="ml-0.5 text-[15px] font-medium text-muted-foreground">{suffixe}</span>}
        </span>
      )}
      {detail && !chargement && <span className="mt-1.5 text-[12px] text-muted-foreground">{detail}</span>}
    </Racine>
  );
}

export function StatTiles({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{children}</div>;
}

export function ChartCard({
  titre,
  description,
  vide,
  chargement,
  children,
  className,
  actions,
}: {
  titre: string;
  description?: ReactNode;
  vide?: boolean;
  chargement?: boolean;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <Card className={cn('flex flex-col break-inside-avoid', className)}>
      <CardHeader>
        <div>
          <CardTitle>{titre}</CardTitle>
          {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="flex-1">
        {chargement ? (
          <Skeleton className="h-48 w-full" />
        ) : vide ? (
          <div className="grid h-40 place-items-center text-[13px] text-muted-foreground">Aucune donnée sur la période</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// Répartition d'une magnitude par catégorie : une seule teinte (jamais une
// couleur par barre), libellés et valeurs toujours visibles, 10 premières
// catégories.
export function BarresRepartition({
  donnees,
  max = 10,
  largeurLibelle = 150,
}: {
  donnees: { libelle: string; total: number; couleur?: string }[];
  max?: number;
  largeurLibelle?: number;
}) {
  const top = donnees.slice(0, max);
  const plusGrand = Math.max(1, ...top.map((d) => d.total));
  return (
    <ul className="space-y-2.5">
      {top.map((d, i) => (
        <li
          key={`${d.libelle}-${i}`}
          className="grid items-center gap-3 text-[13px]"
          style={{ gridTemplateColumns: `${largeurLibelle}px 1fr 36px` }}
          title={`${d.libelle} : ${d.total}`}
        >
          <span className="truncate text-muted-foreground">{d.libelle}</span>
          <span className="h-5">
            <span
              className="block h-full rounded-r-[4px] print:[print-color-adjust:exact]"
              style={{ width: `${Math.max(3, (d.total / plusGrand) * 100)}%`, background: d.couleur ?? 'var(--chart-1)' }}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{d.total}</span>
        </li>
      ))}
      {donnees.length > max && (
        <li className="pt-1 text-[12px] text-muted-foreground">+ {donnees.length - max} autre(s) catégorie(s)</li>
      )}
    </ul>
  );
}

export interface PresetPeriode {
  libelle: string;
  periode: () => [Dayjs, Dayjs];
}

// Période des pages Statistiques : raccourcis + plage libre. `null` = toute
// la période.
export function PeriodeFiltre({
  periode,
  onChange,
  presets,
  effacable,
}: {
  periode: [Dayjs, Dayjs] | null;
  onChange: (periode: [Dayjs, Dayjs] | null) => void;
  presets: PresetPeriode[];
  effacable?: boolean;
}) {
  const actif = (p: PresetPeriode) => {
    if (!periode) return false;
    const [d, f] = p.periode();
    return d.isSame(periode[0], 'day') && f.isSame(periode[1], 'day');
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {effacable && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            'h-8 cursor-pointer rounded-full border px-3 text-[13px] font-medium',
            periode === null ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted',
          )}
        >
          Toute la période
        </button>
      )}
      {presets.map((p) => (
        <button
          key={p.libelle}
          type="button"
          onClick={() => onChange(p.periode())}
          className={cn(
            'h-8 cursor-pointer rounded-full border px-3 text-[13px] font-medium',
            actif(p) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted',
          )}
        >
          {p.libelle}
        </button>
      ))}
      <PlageDates valeur={periode} onChange={onChange} effacable={effacable} libelle="Période personnalisée" />
    </div>
  );
}
