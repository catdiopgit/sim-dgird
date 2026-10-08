import { message } from '../../lib/notifications';
import { Download, FileImage, FileText, Paperclip, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { BoutonSuppression } from '../../components/form/actions-ligne';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { usePieceJointeMutations, usePiecesJointes } from '../../hooks/courrier/usePiecesJointes';
import { ouvrirFichier } from '../../config/apiClient';
import type { PieceJointe } from '../../services/courrier/piecesJointes';
import { fr } from '../../utils/dateFr';

interface Props {
  courrierId: string;
  peutModifier: boolean;
}

function taille(octets: number | null): string | null {
  if (octets == null) return null;
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Ko`;
  return `${(octets / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
}

export function CourrierPiecesJointes({ courrierId, peutModifier }: Props) {
  const { data: pieces, isLoading } = usePiecesJointes(courrierId);
  const { upload, supprimer } = usePieceJointeMutations(courrierId);
  const [estScan, setEstScan] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onTelecharger = async (piece: PieceJointe) => {
    if (!piece.storage_path) return;
    try {
      await ouvrirFichier(`/courrier/pieces-jointes/${piece.id}/telecharger`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Échec du téléchargement.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Pièces jointes
          {pieces && pieces.length > 0 && <span className="ml-2 font-normal text-muted-foreground">{pieces.length}</span>}
        </CardTitle>
        {peutModifier && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={estScan}
                onChange={(e) => setEstScan(e.target.checked)}
                className="size-4 rounded accent-[var(--primary)]"
              />
              Scan du courrier
            </label>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              aria-label="Choisir un fichier à joindre"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate({ file, estScan });
                e.target.value = '';
              }}
            />
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
              <Upload />
              {upload.isPending ? 'Envoi…' : 'Ajouter un fichier'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : !pieces || pieces.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-[13px] text-muted-foreground">
            <Paperclip className="size-5" />
            Aucune pièce jointe.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {pieces.map((p) => {
              const Icone = p.type_mime?.startsWith('image/') ? FileImage : FileText;
              const details = [taille(p.taille_octets), fr(p.created_at).format('D MMM YYYY')].filter(Boolean).join(' · ');
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icone className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium" title={p.nom_fichier}>
                        {p.nom_fichier}
                      </span>
                      {p.est_scan && <Badge variant="muted">Scan</Badge>}
                      {p.est_decharge && <Badge variant="success">Décharge</Badge>}
                    </div>
                    <div className="text-[12px] text-muted-foreground">{details}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={!p.storage_path}
                    onClick={() => onTelecharger(p)}
                    aria-label={`Télécharger ${p.nom_fichier}`}
                    title="Télécharger"
                  >
                    <Download />
                  </Button>
                  {peutModifier && p.storage_path && (
                    <BoutonSuppression
                      libelle={`Supprimer ${p.nom_fichier}`}
                      titre="Supprimer ce fichier ?"
                      enCours={supprimer.isPending}
                      onConfirmer={(fermer) => supprimer.mutate({ id: p.id, storagePath: p.storage_path! }, { onSuccess: fermer })}
                    >
                      <p>
                        Le fichier <strong className="break-all">{p.nom_fichier}</strong> sera définitivement supprimé du
                        courrier.
                      </p>
                    </BoutonSuppression>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
