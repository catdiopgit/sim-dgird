import { ChevronsUpDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import { champBase } from '../../lib/styles';

// <select> natif stylé comme les champs shadcn : accessible, utilisable au
// clavier et au doigt sans dépendance supplémentaire, adapté aux listes de
// référentiel (entités, types, priorités…).
export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className={cn('relative', className)}>
      <select data-slot="native-select" className={cn(champBase, 'h-10 cursor-pointer appearance-none pl-3 pr-9')} {...props}>
        {children}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
