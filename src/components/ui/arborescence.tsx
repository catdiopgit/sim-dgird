import { ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export interface NoeudArbre {
  id: string;
  /** Libellé accessible du nœud (bouton déplier/replier). */
  libelle: string;
  contenu: ReactNode;
  /** Actions alignées à droite de la ligne (menu, boutons). */
  actions?: ReactNode;
  enfants: NoeudArbre[];
  attenue?: boolean;
}

// Arborescence (remplace antd Tree) : listes imbriquées, boutons
// déplier/replier avec aria-expanded, filets de hiérarchie. Tout est déplié
// par défaut, comme l'ancien `defaultExpandAll`.
export function Arborescence({ noeuds, libelle }: { noeuds: NoeudArbre[]; libelle: string }) {
  const [replies, setReplies] = useState<Set<string>>(new Set());

  const basculer = (id: string) =>
    setReplies((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });

  const idsAvecEnfants = (liste: NoeudArbre[]): string[] =>
    liste.flatMap((n) => (n.enfants.length > 0 ? [n.id, ...idsAvecEnfants(n.enfants)] : []));
  const toutReplie = replies.size > 0;

  const rendre = (liste: NoeudArbre[], niveau: number) => (
    <ul className={cn(niveau > 0 && 'ml-[15px] border-l border-border pl-3')}>
      {liste.map((n) => {
        const ouvert = !replies.has(n.id);
        return (
          <li key={n.id}>
            <div
              className={cn(
                'group flex min-h-10 items-center gap-1.5 rounded-md pr-1 hover:bg-muted/60',
                n.attenue && 'opacity-60',
              )}
            >
              {n.enfants.length > 0 ? (
                <button
                  type="button"
                  onClick={() => basculer(n.id)}
                  aria-expanded={ouvert}
                  aria-label={`${ouvert ? 'Replier' : 'Déplier'} ${n.libelle}`}
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className={cn('size-4 transition-transform', ouvert && 'rotate-90')} />
                </button>
              ) : (
                <span className="size-7 shrink-0" aria-hidden />
              )}
              <div className="min-w-0 flex-1">{n.contenu}</div>
              {n.actions && <div className="shrink-0">{n.actions}</div>}
            </div>
            {n.enfants.length > 0 && ouvert && rendre(n.enfants, niveau + 1)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div aria-label={libelle} role="group">
      {idsAvecEnfants(noeuds).length > 0 && (
        <div className="mb-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setReplies(toutReplie ? new Set() : new Set(idsAvecEnfants(noeuds)))}
          >
            {toutReplie ? <ChevronsUpDown /> : <ChevronsDownUp />}
            {toutReplie ? 'Tout déplier' : 'Tout replier'}
          </Button>
        </div>
      )}
      <div className="rounded-lg border border-border p-2">{rendre(noeuds, 0)}</div>
    </div>
  );
}
