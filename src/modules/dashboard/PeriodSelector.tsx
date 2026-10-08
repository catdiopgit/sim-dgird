import dayjs from 'dayjs';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { periodeDepuisPreset, PRESETS_LABEL, type Periode, type PeriodePreset } from './periode';

interface Props {
  periode: Periode;
  onChange: (periode: Periode) => void;
}

const FORMAT = 'YYYY-MM-DD';

// Sélecteur de période du tableau de bord (barre d'en-tête). La plage
// personnalisée se saisit dans une fenêtre dédiée plutôt qu'en ligne, pour
// ne pas encombrer l'en-tête sur les écrans moyens.
export function PeriodSelector({ periode, onChange }: Props) {
  const [saisieOuverte, setSaisieOuverte] = useState(false);
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');

  const libelle =
    periode.preset === 'personnalise'
      ? `${periode.debut.format('DD/MM')} – ${periode.fin.format('DD/MM/YYYY')}`
      : PRESETS_LABEL[periode.preset];

  const ouvrirSaisie = () => {
    setDebut(periode.debut.format(FORMAT));
    setFin(periode.fin.format(FORMAT));
    setSaisieOuverte(true);
  };

  const incoherent = Boolean(debut && fin && fin < debut);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label={`Période du tableau de bord : ${libelle}`}>
            <CalendarDays className="text-muted-foreground" />
            <span className="hidden tabular-nums sm:inline">{libelle}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Période</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={periode.preset}
            onValueChange={(value) => {
              if (value === 'personnalise') return; // saisie via la fenêtre (onSelect)
              onChange(periodeDepuisPreset(value as PeriodePreset, periode.debut, periode.fin));
            }}
          >
            {Object.entries(PRESETS_LABEL).map(([value, label]) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {label}
              </DropdownMenuRadioItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuRadioItem value="personnalise" onSelect={ouvrirSaisie}>
              Période personnalisée…
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <FormDialog
        open={saisieOuverte}
        onClose={() => setSaisieOuverte(false)}
        titre="Période personnalisée"
        description="Les indicateurs du tableau de bord porteront sur cette plage."
        libelleValider="Appliquer"
        validerDesactive={!debut || !fin || incoherent}
        onSubmit={(e) => {
          e.preventDefault();
          if (!debut || !fin || incoherent) return;
          onChange({ preset: 'personnalise', debut: dayjs(debut).startOf('day'), fin: dayjs(fin).endOf('day') });
          setSaisieOuverte(false);
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <Champ label="Du" htmlFor="periode-debut" requis>
            <Input id="periode-debut" type="date" value={debut} max={fin || undefined} onChange={(e) => setDebut(e.target.value)} />
          </Champ>
          <Champ
            label="Au"
            htmlFor="periode-fin"
            requis
            erreur={incoherent ? 'La date de fin doit suivre la date de début.' : undefined}
          >
            <Input
              id="periode-fin"
              type="date"
              value={fin}
              min={debut || undefined}
              aria-invalid={incoherent}
              aria-describedby={incoherent ? 'periode-fin-erreur' : undefined}
              onChange={(e) => setFin(e.target.value)}
            />
          </Champ>
        </div>
      </FormDialog>
    </>
  );
}
