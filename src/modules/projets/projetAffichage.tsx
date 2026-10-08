import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import type { ValeurListe } from '../../services/administration/parametrage';
import type { Projet } from '../../services/projets/projets';
import { couleurReferentiel } from '../../utils/couleurReferentiel';

// Badge d'une valeur de référentiel (statut, priorité…) : pastille à la
// couleur paramétrée + libellé (jamais la couleur seule).
export function BadgeValeur({ valeur }: { valeur: Pick<ValeurListe, 'libelle' | 'couleur'> | null | undefined }) {
  if (!valeur) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge shape="pill">
      <span className="size-2 rounded-full" style={{ background: couleurReferentiel(valeur.couleur) ?? 'var(--st-neutral)' }} />
      {valeur.libelle}
    </Badge>
  );
}

export function BadgeCloture({ statut }: { statut: Projet['cloture_statut'] }) {
  if (statut === 'confirmee') return <Badge variant="success" shape="pill">Clôturé</Badge>;
  if (statut === 'demandee') return <Badge variant="warning" shape="pill">Clôture en attente</Badge>;
  if (statut === 'rejetee') return <Badge variant="critical" shape="pill">Clôture rejetée</Badge>;
  return null;
}

export function BarreAvancement({ pct, className }: { pct: number; className?: string }) {
  const valeur = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={valeur}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avancement"
      >
        <div className={cn('h-full rounded-full', valeur >= 100 ? 'bg-good' : 'bg-primary')} style={{ width: `${valeur}%` }} />
      </div>
      <span className="w-11 shrink-0 whitespace-nowrap text-right text-[12px] font-medium tabular-nums">{valeur} %</span>
    </div>
  );
}
