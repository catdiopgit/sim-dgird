import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

// Indicateur d'étapes d'un assistant (numéros, coche pour les étapes
// franchies, libellé de l'étape courante toujours visible).
export function Etapes({ etapes, courante }: { etapes: string[]; courante: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Étapes">
      {etapes.map((libelle, i) => {
        const faite = i < courante;
        const active = i === courante;
        return (
          <li key={libelle} className={cn('flex min-w-0 items-center gap-2', i < etapes.length - 1 && 'flex-1')} aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums',
                faite && 'bg-primary text-primary-foreground',
                active && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                !faite && !active && 'border border-border text-muted-foreground',
              )}
            >
              {faite ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn('truncate text-[12px]', active ? 'font-semibold' : 'hidden text-muted-foreground sm:inline')}>{libelle}</span>
            {i < etapes.length - 1 && <span className={cn('h-px min-w-3 flex-1', faite ? 'bg-primary' : 'bg-border')} />}
          </li>
        );
      })}
    </ol>
  );
}

// Fenêtre d'assistant : en-tête avec titre et étapes, corps défilant, pied
// fourni par l'appelant (boutons dépendant de l'étape).
export function WizardDialog({
  open,
  onClose,
  titre,
  etapes,
  courante,
  pied,
  children,
  bloquerFermeture,
}: {
  open: boolean;
  onClose: () => void;
  titre: string;
  etapes: string[];
  courante: number;
  pied: ReactNode;
  children: ReactNode;
  bloquerFermeture?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !bloquerFermeture && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="space-y-4">
          <div>
            <DialogTitle>{titre}</DialogTitle>
            <DialogDescription className="sr-only">
              Étape {courante + 1} sur {etapes.length} : {etapes[courante]}
            </DialogDescription>
          </div>
          <Etapes etapes={etapes} courante={courante} />
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        <DialogFooter>{pied}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Ligne de récapitulatif (étape de vérification avant validation).
export function LigneRecap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border py-2.5 last:border-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[14px]">{children || '—'}</dd>
    </div>
  );
}
