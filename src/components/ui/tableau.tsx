import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { EtatVide } from './page-header';
import { Skeleton } from './skeleton';

export interface Colonne<T> {
  cle: string;
  titre: ReactNode;
  rendu: (ligne: T) => ReactNode;
  /** Classes de la cellule (et de l'en-tête) : largeur, alignement… */
  className?: string;
}

// Tableau de données simple (remplace antd Table sans pagination) : en-tête
// discret, lignes survolables, sélection de ligne optionnelle, squelette de
// chargement et état vide intégrés.
export function Tableau<T>({
  colonnes,
  lignes,
  cleLigne,
  chargement,
  vide,
  onLigneClic,
  estActive,
  minLargeur = 560,
  libelle,
}: {
  colonnes: Colonne<T>[];
  lignes: T[] | undefined;
  cleLigne: (ligne: T) => string;
  chargement?: boolean;
  vide?: { icone: LucideIcon; titre: ReactNode; description?: ReactNode };
  onLigneClic?: (ligne: T) => void;
  estActive?: (ligne: T) => boolean;
  minLargeur?: number;
  libelle?: string;
}) {
  const donnees = lignes ?? [];
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-[13px]" style={{ minWidth: minLargeur }} aria-label={libelle}>
        <thead>
          <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
            {colonnes.map((c) => (
              <th key={c.cle} scope="col" className={cn('px-3 py-2.5 font-medium first:pl-4 last:pr-4', c.className)}>
                {c.titre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chargement &&
            Array.from({ length: 3 }, (_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td colSpan={colonnes.length} className="px-4 py-2.5">
                  <Skeleton className="h-7 w-full" />
                </td>
              </tr>
            ))}
          {!chargement &&
            donnees.map((ligne) => {
              const active = estActive?.(ligne) ?? false;
              return (
                <tr
                  key={cleLigne(ligne)}
                  onClick={onLigneClic ? () => onLigneClic(ligne) : undefined}
                  onKeyDown={
                    onLigneClic
                      ? (e) => {
                          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onLigneClic(ligne);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onLigneClic ? 0 : undefined}
                  aria-selected={onLigneClic ? active : undefined}
                  className={cn(
                    'border-b border-border last:border-0',
                    onLigneClic && 'cursor-pointer outline-none focus-visible:bg-muted',
                    active ? 'bg-accent/60 hover:bg-accent/60' : 'hover:bg-muted/60',
                  )}
                >
                  {colonnes.map((c, i) => (
                    <td
                      key={c.cle}
                      className={cn(
                        'px-3 py-2 align-middle first:pl-4 last:pr-4',
                        active && i === 0 && 'shadow-[inset_3px_0_0_var(--primary)]',
                        c.className,
                      )}
                    >
                      {c.rendu(ligne)}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
      {!chargement && donnees.length === 0 && vide && <EtatVide icone={vide.icone} titre={vide.titre} description={vide.description} />}
    </div>
  );
}

// Pied de tableau : total et navigation entre pages (pagination côté client).
export function PaginationTableau({
  total,
  unite,
  page,
  nbPages,
  onPage,
}: {
  total: number;
  /** Singulier, ex. « événement » (pluriel en -s). */
  unite: string;
  page: number;
  nbPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">
      <span className="tabular-nums">
        {total} {unite}
        {total > 1 ? 's' : ''}
      </span>
      {nbPages > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Page précédente">
            <ChevronLeft />
          </Button>
          <span className="px-2 tabular-nums">
            Page {page} / {nbPages}
          </span>
          <Button variant="outline" size="icon" className="size-8" disabled={page === nbPages} onClick={() => onPage(page + 1)} aria-label="Page suivante">
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
