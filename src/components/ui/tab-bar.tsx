import { cn } from '../../lib/utils';

export interface OngletBarre<K extends string> {
  cle: K;
  libelle: string;
  compteur?: number;
  ton?: 'critique';
}

// Onglets soulignés (bannettes, vues, sections d'une fiche) : défilement
// horizontal sans barre visible sur écran étroit.
export function TabBar<K extends string>({
  onglets,
  actif,
  onChange,
  label,
}: {
  onglets: OngletBarre<K>[];
  actif: K;
  onChange: (cle: K) => void;
  label: string;
}) {
  return (
    <div className="no-scrollbar overflow-x-auto border-b border-border" role="tablist" aria-label={label}>
      <div className="flex min-w-max gap-1">
        {onglets.map((o) => {
          const estActif = o.cle === actif;
          return (
            <button
              key={o.cle}
              type="button"
              role="tab"
              aria-selected={estActif}
              onClick={() => onChange(o.cle)}
              className={cn(
                'relative inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium',
                estActif ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {o.libelle}
              {o.compteur ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-[11px] tabular-nums',
                    o.ton === 'critique' ? 'bg-crit/12 text-crit-text' : estActif ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}
                >
                  {o.compteur}
                </span>
              ) : null}
              {estActif && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
