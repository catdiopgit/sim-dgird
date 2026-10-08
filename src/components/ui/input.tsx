import type { ComponentProps } from 'react';
import { champBase } from '../../lib/styles';
import { cn } from '../../lib/utils';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(champBase, 'h-10 px-3', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(champBase, 'min-h-20 resize-y px-3 py-2.5', className)} {...props} />;
}
