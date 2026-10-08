import { CircleAlert, FileUp, Paperclip, X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

// Champ de formulaire : libellé (+ astérisque si requis), contrôle, aide et
// message d'erreur relié au contrôle par `${htmlFor}-erreur` (à passer en
// aria-describedby côté contrôle).
export function Champ({
  label,
  htmlFor,
  requis,
  aide,
  erreur,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  requis?: boolean;
  aide?: ReactNode;
  erreur?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium">
        {label} {requis && <span className="text-crit-text">*</span>}
      </label>
      {children}
      {erreur ? (
        <p id={htmlFor ? `${htmlFor}-erreur` : undefined} className="mt-1.5 flex items-center gap-1 text-[12px] text-crit-text">
          <CircleAlert className="size-3.5 shrink-0" />
          {erreur}
        </p>
      ) : (
        aide && <p className="mt-1.5 text-[12px] text-muted-foreground">{aide}</p>
      )}
    </div>
  );
}

// Sélection d'un fichier (remplace antd Upload en mode « un seul fichier,
// envoyé à la soumission ») : zone cliquable, nom du fichier choisi, retrait.
export function ChampFichier({
  id,
  fichier,
  onChange,
  accept,
  invalide,
}: {
  id: string;
  fichier: File | null;
  onChange: (fichier: File | null) => void;
  accept?: string;
  invalide?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      {fichier ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
          <Paperclip className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{fichier.name}</span>
          <span className="shrink-0 text-[12px] text-muted-foreground">{Math.max(1, Math.round(fichier.size / 1024))} Ko</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Retirer le fichier"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-[13px] text-muted-foreground transition-colors hover:border-ring hover:bg-muted/40',
            invalide ? 'border-crit' : 'border-input',
          )}
        >
          <FileUp className="size-5" />
          <span>
            <span className="font-medium text-foreground">Choisir un fichier</span> sur l'ordinateur
          </span>
        </button>
      )}
    </div>
  );
}
