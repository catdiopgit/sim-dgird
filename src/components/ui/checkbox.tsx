import { Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

// Case à cocher native + libellé cliquable.
export function CaseACocher({
  checked,
  onChange,
  children,
  className,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn('flex items-start gap-2.5 text-[13px]', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded accent-[var(--primary)]"
      />
      <span>{children}</span>
    </label>
  );
}

// Sélection multiple dans une liste courte (remplace antd Select mode="multiple").
export function ListeCases({
  options,
  valeurs,
  onChange,
  vide = 'Aucun élément',
  id,
  desactive,
  libelle,
}: {
  options: { valeur: string; libelle: string }[];
  valeurs: string[];
  onChange: (valeurs: string[]) => void;
  vide?: string;
  id?: string;
  desactive?: boolean;
  /** Nom accessible du groupe (et de son champ de recherche). */
  libelle?: string;
}) {
  const [filtre, setFiltre] = useState('');
  if (options.length === 0) return <p className="text-[13px] text-muted-foreground">{vide}</p>;
  // Filtre affiché au-delà de 8 options ; les cases cochées restent visibles.
  const avecRecherche = options.length > 8;
  const terme = filtre.trim().toLowerCase();
  const visibles = terme
    ? options.filter((o) => valeurs.includes(o.valeur) || o.libelle.toLowerCase().includes(terme))
    : options;
  return (
    <div id={id} role="group" aria-label={libelle} className="overflow-hidden rounded-lg border border-input">
      {avecRecherche && (
        <label className="relative block border-b border-input">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Filtrer…"
            aria-label={libelle ? `Filtrer — ${libelle}` : 'Filtrer'}
            className="h-9 w-full bg-transparent pl-8 pr-3 text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </label>
      )}
      <div className="max-h-48 space-y-2 overflow-y-auto p-3">
        {visibles.map((o) => (
          <CaseACocher
            key={o.valeur}
            disabled={desactive}
            checked={valeurs.includes(o.valeur)}
            onChange={(coche) => onChange(coche ? [...valeurs, o.valeur] : valeurs.filter((v) => v !== o.valeur))}
          >
            {o.libelle}
          </CaseACocher>
        ))}
        {visibles.length === 0 && <p className="text-[13px] text-muted-foreground">Aucun résultat.</p>}
      </div>
      {valeurs.length > 0 && (
        <div className="border-t border-input px-3 py-1.5 text-[12px] tabular-nums text-muted-foreground">
          {valeurs.length} sélectionné{valeurs.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
