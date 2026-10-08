import { LoaderCircle } from 'lucide-react';
import type { FormEventHandler, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

const LARGEURS = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' } as const;

// Fenêtre de formulaire standard (remplace les Modal antd) : en-tête titré,
// corps défilant, pied Annuler / Valider. Le bouton Valider soumet le <form>,
// donc la touche Entrée valide aussi ; la validation reste celle du
// formulaire (react-hook-form + zod).
export function FormDialog({
  open,
  onClose,
  titre,
  description,
  onSubmit,
  enCours,
  libelleValider = 'Enregistrer',
  validerDesactive,
  largeur = 'md',
  children,
  variante = 'default',
}: {
  open: boolean;
  onClose: () => void;
  titre: ReactNode;
  description?: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  enCours?: boolean;
  libelleValider?: string;
  validerDesactive?: boolean;
  largeur?: keyof typeof LARGEURS;
  children: ReactNode;
  variante?: 'default' | 'destructive';
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !enCours && onClose()}>
      <DialogContent className={cn(LARGEURS[largeur])}>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{titre}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{titre}</DialogDescription>}
          </DialogHeader>
          <DialogBody className="space-y-4">{children}</DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={enCours}>
              Annuler
            </Button>
            <Button type="submit" variant={variante} disabled={enCours || validerDesactive}>
              {enCours && <LoaderCircle className="animate-spin" />}
              {libelleValider}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
