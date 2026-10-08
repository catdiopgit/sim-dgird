import { ArrowLeft, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  titre: ReactNode;
  description?: ReactNode;
  /** Ligne au-dessus du titre (type d'objet, référence, badges…). */
  surtitre?: ReactNode;
  retour?: { vers: string; libelle: string };
  actions?: ReactNode;
  className?: string;
}

// En-tête commun des écrans refondus : lien retour, surtitre, titre serif,
// description et actions alignées à droite (empilées sur mobile).
export function PageHeader({ titre, description, surtitre, retour, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {retour && (
        <Link to={retour.vers} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {retour.libelle}
        </Link>
      )}
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0">
          {surtitre && <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">{surtitre}</div>}
          <h1 className="font-serif-title text-[26px] font-semibold leading-tight sm:text-[28px]">{titre}</h1>
          {description && <p className="mt-1.5 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </header>
    </div>
  );
}

export function EtatVide({ icone: Icone, titre, description, children }: {
  icone: LucideIcon;
  titre: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-muted">
        <Icone className="size-5 text-muted-foreground" />
      </div>
      <div className="font-medium">{titre}</div>
      {description && <div className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</div>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

// En-tête d'une sous-section (gestionnaires d'administration…) : titre,
// description facultative et action(s) alignées à droite.
export function EnTeteSection({ titre, description, actions, className }: {
  titre: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold leading-snug">{titre}</h3>
        {description && <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
