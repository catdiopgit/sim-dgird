import { FileText, FileUp, Loader2, ScanLine, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { message } from '../../../lib/notifications';
import { Button } from '../../../components/ui/button';
import { cn, genererId } from '../../../lib/utils';
import { etatAgentScan, numeriser } from '../../../services/scanner/agentScan';
import type { PieceJointeStagee } from './PiecesJointesStagingList';

// Étape « Documents » de l'assistant courrier arrivé (recette 2026-11) :
//  - Document principal : obligatoire, un seul fichier (PDF ou image) ;
//  - Pièces jointes : facultatives, plusieurs fichiers.
// Chaque zone accepte un fichier choisi sur le poste ou une numérisation
// directe via l'agent local. Rien n'est envoyé avant la validation finale ;
// le document principal est transmis avec estScan = true.

const TYPES_PRINCIPAL = 'application/pdf,image/jpeg,image/png,image/tiff';

function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

interface Props {
  fichiers: PieceJointeStagee[];
  onChange: (fichiers: PieceJointeStagee[]) => void;
  erreurPrincipal?: string;
}

export function DocumentsArriveStaging({ fichiers, onChange, erreurPrincipal }: Props) {
  const principal = fichiers.find((f) => f.estScan);
  const annexes = fichiers.filter((f) => !f.estScan);
  const [agent, setAgent] = useState<{ disponible: boolean; scanner?: string } | null>(null);
  const [scanEnCours, setScanEnCours] = useState<'principal' | 'annexe' | null>(null);

  useEffect(() => {
    let actif = true;
    void etatAgentScan().then((etat) => actif && setAgent(etat));
    return () => {
      actif = false;
    };
  }, []);

  const definirPrincipal = (file: File) =>
    onChange([{ id: genererId(), file, estScan: true }, ...fichiers.filter((f) => !f.estScan)]);
  const ajouterAnnexes = (liste: File[]) =>
    onChange([...fichiers, ...liste.map((file) => ({ id: genererId(), file, estScan: false }))]);
  const retirer = (id: string) => onChange(fichiers.filter((f) => f.id !== id));

  const scanner = async (cible: 'principal' | 'annexe') => {
    setScanEnCours(cible);
    try {
      const fichier = await numeriser(cible === 'principal' ? 'courrier' : 'piece-jointe');
      if (cible === 'principal') definirPrincipal(fichier);
      else ajouterAnnexes([fichier]);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setScanEnCours(null);
    }
  };

  const titreScan = !agent
    ? 'Recherche de l’agent de numérisation…'
    : agent.disponible
      ? `Numériser avec ${agent.scanner ?? 'le scanner du poste'}`
      : 'Agent de numérisation non détecté sur ce poste';

  return (
    <div className="space-y-6">
      <Zone
        titre="Document principal"
        requis
        aide="Le courrier lui-même : un seul fichier PDF ou image."
        erreur={!principal ? erreurPrincipal : undefined}
        accept={TYPES_PRINCIPAL}
        multiple={false}
        onFichiers={(liste) => liste[0] && definirPrincipal(liste[0])}
        onScanner={() => void scanner('principal')}
        scanDisponible={!!agent?.disponible}
        scanEnCours={scanEnCours === 'principal'}
        titreScan={titreScan}
        libelleDepot={principal ? 'Remplacer le document principal' : 'Choisir un PDF ou glisser-déposer le courrier'}
      >
        {principal && <LigneFichier item={principal} onRetirer={() => retirer(principal.id)} />}
      </Zone>

      <Zone
        titre="Pièces jointes"
        aide="Facultatif : annexes accompagnant le courrier. Plusieurs fichiers possibles."
        multiple
        onFichiers={ajouterAnnexes}
        onScanner={() => void scanner('annexe')}
        scanDisponible={!!agent?.disponible}
        scanEnCours={scanEnCours === 'annexe'}
        titreScan={titreScan}
        libelleDepot="Choisir des fichiers ou glisser-déposer les pièces jointes"
      >
        {annexes.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {annexes.map((item) => (
              <LigneFichier key={item.id} item={item} onRetirer={() => retirer(item.id)} enListe />
            ))}
          </ul>
        )}
      </Zone>

      <p className="text-[12px] text-muted-foreground">Rien n'est envoyé avant la validation finale.</p>
    </div>
  );
}

function Zone({
  titre,
  requis,
  aide,
  erreur,
  accept,
  multiple,
  onFichiers,
  onScanner,
  scanDisponible,
  scanEnCours,
  titreScan,
  libelleDepot,
  children,
}: {
  titre: string;
  requis?: boolean;
  aide: string;
  erreur?: string;
  accept?: string;
  multiple: boolean;
  onFichiers: (fichiers: File[]) => void;
  onScanner: () => void;
  scanDisponible: boolean;
  scanEnCours: boolean;
  titreScan: string;
  libelleDepot: string;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const recevoir = (liste: FileList | null) => {
    if (liste && liste.length > 0) onFichiers(multiple ? [...liste] : [liste[0]]);
  };

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-semibold">
            {titre}
            {requis && <span className="ml-0.5 text-crit-text">*</span>}
          </h3>
          <p className="text-[12px] text-muted-foreground">{aide}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <FileUp />
            {multiple ? 'Ajouter des fichiers' : 'Choisir un PDF'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            title={titreScan}
            disabled={!scanDisponible || scanEnCours}
            onClick={onScanner}
          >
            {scanEnCours ? <Loader2 className="animate-spin" /> : <ScanLine />}
            {scanEnCours ? 'Numérisation…' : 'Scanner'}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        aria-label={titre}
        onChange={(e) => {
          recevoir(e.target.files);
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
          recevoir(e.dataTransfer.files);
        }}
        className={cn(
          'flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-[13px] transition-colors',
          erreur ? 'border-crit/60 bg-crit/5' : survol ? 'border-primary bg-accent' : 'border-input hover:border-ring hover:bg-muted/40',
        )}
      >
        <FileUp className="size-5 text-muted-foreground" />
        <span>{libelleDepot}</span>
      </button>
      {erreur && (
        <p role="alert" className="text-[12px] text-crit-text">
          {erreur}
        </p>
      )}
      {children}
    </section>
  );
}

function LigneFichier({ item, onRetirer, enListe }: { item: PieceJointeStagee; onRetirer: () => void; enListe?: boolean }) {
  const contenu = (
    <>
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{item.file.name}</div>
        <div className="text-[12px] text-muted-foreground">{formatTaille(item.file.size)}</div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-crit-text hover:bg-crit/10"
        aria-label={`Retirer ${item.file.name}`}
        onClick={onRetirer}
      >
        <Trash2 />
      </Button>
    </>
  );
  return enListe ? (
    <li className="flex items-center gap-3 px-3 py-2.5">{contenu}</li>
  ) : (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">{contenu}</div>
  );
}
