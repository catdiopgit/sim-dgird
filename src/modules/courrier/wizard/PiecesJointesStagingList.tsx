import { FileText, FileUp, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

export interface PieceJointeStagee {
  id: string;
  file: File;
  estScan: boolean;
}

interface Props {
  fichiers: PieceJointeStagee[];
  onChange: (fichiers: PieceJointeStagee[]) => void;
}

function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

// Contrairement à CourrierPiecesJointes.tsx (persistance immédiate), ce
// composant garde les fichiers en mémoire côté client tant que le courrier
// n'existe pas encore (le courrier n'est inséré qu'à la validation finale de
// l'assistant — cf. plan V3 §E). L'upload réel réutilise le même service
// (uploadPieceJointe) une fois le courrier créé.
export function PiecesJointesStagingList({ fichiers, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);

  const ajouter = (liste: FileList | null) => {
    if (!liste || liste.length === 0) return;
    const nouveaux = [...liste].map((file, i) => ({
      id: crypto.randomUUID(),
      file,
      // Le premier fichier déposé est proposé comme scan du courrier.
      estScan: fichiers.length === 0 && i === 0,
    }));
    onChange([...fichiers, ...nouveaux]);
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        aria-label="Choisir des fichiers"
        onChange={(e) => {
          ajouter(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          ajouter(e.dataTransfer.files);
        }}
        className={cn(
          'flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
          survol ? 'border-primary bg-accent' : 'border-input hover:border-ring hover:bg-muted/40',
        )}
      >
        <FileUp className="size-7 text-muted-foreground" />
        <span className="text-[14px] font-medium">Cliquez ou glissez-déposez le document principal et les pièces jointes</span>
        <span className="text-[12px] text-muted-foreground">Plusieurs fichiers possibles. Rien n'est envoyé avant la validation finale.</span>
      </button>

      {fichiers.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {fichiers.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{item.file.name}</div>
                <div className="text-[12px] text-muted-foreground">{formatTaille(item.file.size)}</div>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={item.estScan}
                  onChange={(e) => onChange(fichiers.map((f) => ({ ...f, estScan: f.id === item.id ? e.target.checked : false })))}
                  className="size-4 rounded accent-[var(--primary)]"
                />
                Scan du courrier
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-crit-text hover:bg-crit/10"
                aria-label={`Retirer ${item.file.name}`}
                onClick={() => onChange(fichiers.filter((f) => f.id !== item.id))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
