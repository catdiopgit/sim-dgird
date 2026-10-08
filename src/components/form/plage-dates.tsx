import dayjs, { type Dayjs } from 'dayjs';
import { X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { champBase } from '../../lib/styles';
import { cn } from '../../lib/utils';

const FORMAT = 'YYYY-MM-DD';

// Plage de dates (remplace antd RangePicker) : deux champs date natifs liés
// (min/max croisés). La plage n'est transmise que complète et cohérente,
// comme le RangePicker (qui n'émettait qu'une fois les deux bornes choisies).
// Les bornes sont en début de journée ; chaque écran normalise ensuite.
export function PlageDates({
  valeur,
  onChange,
  effacable,
  libelle = 'Période',
  className,
}: {
  valeur: [Dayjs, Dayjs] | null;
  onChange: (valeur: [Dayjs, Dayjs] | null) => void;
  effacable?: boolean;
  libelle?: string;
  className?: string;
}) {
  const id = useId();
  const [debut, setDebut] = useState(valeur ? valeur[0].format(FORMAT) : '');
  const [fin, setFin] = useState(valeur ? valeur[1].format(FORMAT) : '');

  // Resynchronise quand la période change de l'extérieur (raccourcis).
  const cleExterne = valeur ? `${valeur[0].format(FORMAT)}|${valeur[1].format(FORMAT)}` : '';
  useEffect(() => {
    setDebut(valeur ? valeur[0].format(FORMAT) : '');
    setFin(valeur ? valeur[1].format(FORMAT) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleExterne]);

  const incoherent = Boolean(debut && fin && fin < debut);

  const appliquer = (d: string, f: string) => {
    if (d && f && f >= d) onChange([dayjs(d).startOf('day'), dayjs(f).startOf('day')]);
    else if (!d && !f && effacable) onChange(null);
  };

  const champ = cn(champBase, 'h-9 w-[9.5rem] px-2.5 text-[13px] tabular-nums');

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div role="group" aria-label={libelle} className="flex flex-wrap items-center gap-1.5">
        <label htmlFor={`${id}-debut`} className="sr-only">
          Date de début
        </label>
        <input
          id={`${id}-debut`}
          type="date"
          className={champ}
          value={debut}
          max={fin || undefined}
          aria-invalid={incoherent}
          onChange={(e) => {
            setDebut(e.target.value);
            appliquer(e.target.value, fin);
          }}
        />
        <span className="text-[13px] text-muted-foreground" aria-hidden>
          →
        </span>
        <label htmlFor={`${id}-fin`} className="sr-only">
          Date de fin
        </label>
        <input
          id={`${id}-fin`}
          type="date"
          className={champ}
          value={fin}
          min={debut || undefined}
          aria-invalid={incoherent}
          aria-describedby={incoherent ? `${id}-erreur` : undefined}
          onChange={(e) => {
            setFin(e.target.value);
            appliquer(debut, e.target.value);
          }}
        />
        {effacable && (debut || fin) && (
          <button
            type="button"
            onClick={() => {
              setDebut('');
              setFin('');
              onChange(null);
            }}
            className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Effacer la période"
            title="Effacer la période"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {incoherent && (
        <p id={`${id}-erreur`} className="text-[12px] text-crit-text">
          La date de fin doit suivre la date de début.
        </p>
      )}
    </div>
  );
}
