import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

// Panneau latéral (remplace antd Drawer) : même primitive Radix que Dialog,
// ancré à droite, pleine hauteur, pleine largeur sur mobile.
export function Sheet({
  open,
  onClose,
  titre,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  titre: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1000] bg-black/40" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-[1000] flex w-full max-w-[520px] flex-col border-l border-border bg-card text-foreground shadow-2xl outline-none',
            className,
          )}
        >
          <div className="shrink-0 border-b border-border px-6 pb-4 pt-5 pr-12">
            <DialogPrimitive.Title className="text-[17px] font-semibold leading-snug">{titre}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-[13px] text-muted-foreground">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{titre}</DialogPrimitive.Description>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          <DialogPrimitive.Close
            className="absolute right-3 top-3 grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
