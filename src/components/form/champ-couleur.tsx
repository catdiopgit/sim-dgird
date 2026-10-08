import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isValidHex } from '../../utils/color';
import { couleurReferentiel } from '../../utils/couleurReferentiel';

// Teintes prédéfinies (noms de préréglages déjà stockés en base, interprétés
// par couleurReferentiel) + une couleur libre via le sélecteur natif.
const PRESETS: { valeur: string; libelle: string }[] = [
  { valeur: 'default', libelle: 'Neutre' },
  { valeur: 'blue', libelle: 'Bleu' },
  { valeur: 'green', libelle: 'Vert' },
  { valeur: 'gold', libelle: 'Or' },
  { valeur: 'red', libelle: 'Rouge' },
  { valeur: 'purple', libelle: 'Violet' },
  { valeur: 'magenta', libelle: 'Magenta' },
  { valeur: 'cyan', libelle: 'Cyan' },
];

export function ChampCouleur({ id, value, onChange }: { id?: string; value?: string; onChange: (valeur: string) => void }) {
  const estPerso = Boolean(value && isValidHex(value));
  // Préréglage déjà stocké mais absent de la palette proposée (ex. 'orange', 'lime') : on l'affiche tel quel.
  const presets =
    value && !estPerso && !PRESETS.some((p) => p.valeur === value) ? [...PRESETS, { valeur: value, libelle: value }] : PRESETS;
  const pastille = 'grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-card transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

  return (
    <div id={id} role="radiogroup" aria-label="Couleur" className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        title="Aucune"
        onClick={() => onChange('')}
        className={cn(pastille, 'border border-dashed border-border text-muted-foreground', !value && 'ring-2 ring-ring')}
      >
        <span className="text-[11px]">—</span>
      </button>
      {presets.map((p) => (
        <button
          key={p.valeur}
          type="button"
          role="radio"
          aria-checked={value === p.valeur}
          aria-label={p.libelle}
          title={p.libelle}
          onClick={() => onChange(p.valeur)}
          className={cn(pastille, value === p.valeur && 'ring-2 ring-ring')}
          style={{ background: couleurReferentiel(p.valeur) }}
        >
          {value === p.valeur && <Check className="size-3.5 text-white" />}
        </button>
      ))}
      <label
        title="Couleur personnalisée"
        className={cn(
          'relative ml-1 flex h-7 cursor-pointer items-center gap-2 rounded-full border border-border pl-1 pr-3 text-[12px] text-muted-foreground hover:bg-muted',
          estPerso && 'ring-2 ring-ring ring-offset-2 ring-offset-card',
        )}
      >
        <span className="size-5 rounded-full border border-border" style={{ background: estPerso ? value : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} />
        {estPerso ? value : 'Autre…'}
        <input
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={estPerso ? value : '#1677ff'}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Couleur personnalisée"
        />
      </label>
    </div>
  );
}
