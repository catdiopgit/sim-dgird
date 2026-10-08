import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-medium [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        outline: 'border border-border text-foreground',
        muted: 'bg-muted text-foreground',
        success: 'bg-good/10 text-good-text',
        warning: 'bg-warn/20 text-warn-text',
        critical: 'bg-crit/10 text-crit-text',
        primary: 'bg-primary text-primary-foreground',
      },
      shape: { square: '', pill: 'rounded-full px-2' },
    },
    defaultVariants: { variant: 'outline', shape: 'square' },
  },
);

export function Badge({ className, variant, shape, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, shape }), className)} {...props} />;
}
