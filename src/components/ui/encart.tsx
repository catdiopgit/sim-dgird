import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variante = 'info' | 'attention' | 'critique' | 'succes';

const STYLES: Record<Variante, { icone: LucideIcon; classes: string; iconeClasses: string }> = {
  info: { icone: Info, classes: 'border-border bg-muted/50', iconeClasses: 'text-primary' },
  attention: { icone: TriangleAlert, classes: 'border-warn/40 bg-warn/10', iconeClasses: 'text-warn-text' },
  critique: { icone: CircleAlert, classes: 'border-crit/30 bg-crit/10', iconeClasses: 'text-crit-text' },
  succes: { icone: CircleCheck, classes: 'border-good/30 bg-good/10', iconeClasses: 'text-good-text' },
};

// Encart d'information (remplace antd Alert) : icône + titre facultatif + texte.
export function Encart({
  variante = 'info',
  titre,
  children,
  className,
}: {
  variante?: Variante;
  titre?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { icone: Icone, classes, iconeClasses } = STYLES[variante];
  return (
    <div
      role={variante === 'critique' ? 'alert' : undefined}
      className={cn('flex gap-3 rounded-lg border p-3.5 text-[13px] leading-relaxed', classes, className)}
    >
      <Icone className={cn('mt-0.5 size-4 shrink-0', iconeClasses)} aria-hidden />
      <div className="min-w-0">
        {titre && <div className="font-semibold text-foreground">{titre}</div>}
        {children && <div className={cn('text-muted-foreground', titre && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}
