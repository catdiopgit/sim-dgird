import { CirclePlus } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

export interface OptionFacette {
  valeur: string;
  libelle: string;
  nombre: number;
  couleur?: string;
}

// Filtre à choix multiples (style « faceted filter » shadcn) : compteur par
// valeur, pastille de couleur optionnelle, menu qui reste ouvert pendant la
// sélection.
export function FacetFilter({
  titre,
  options,
  selection,
  onChange,
}: {
  titre: string;
  options: OptionFacette[];
  selection: string[];
  onChange: (valeurs: string[]) => void;
}) {
  const libelleSelection =
    selection.length === 1 ? options.find((o) => o.valeur === selection[0])?.libelle : `${selection.length} sélectionnés`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <CirclePlus className="size-3.5 text-muted-foreground" />
          {titre}
          {selection.length > 0 && (
            <>
              <span className="mx-0.5 h-4 w-px bg-border" />
              <span className="max-w-32 truncate rounded bg-muted px-1.5 text-[11px]">{libelleSelection}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {options.length === 0 && <div className="px-2.5 py-2 text-[13px] text-muted-foreground">Aucune valeur</div>}
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.valeur}
            checked={selection.includes(o.valeur)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(coche) => onChange(coche ? [...selection, o.valeur] : selection.filter((v) => v !== o.valeur))}
          >
            {o.couleur && <span className="size-2 shrink-0 rounded-full" style={{ background: o.couleur }} />}
            <span className="flex-1 truncate">{o.libelle}</span>
            <span className="text-[12px] tabular-nums text-muted-foreground">{o.nombre}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {selection.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center" onSelect={() => onChange([])}>
              Effacer le filtre
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
