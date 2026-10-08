import type { ReactNode } from 'react';

// Regroupement visuel de champs dans une fenêtre de formulaire longue.
export function SectionFormulaire({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-border pt-4 first:border-0 first:pt-0">
      <legend className="float-left mb-1 w-full text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{titre}</legend>
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}
