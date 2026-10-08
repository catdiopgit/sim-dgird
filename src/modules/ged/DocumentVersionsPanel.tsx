import { Download, History, Upload } from 'lucide-react';
import { useRef } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { telechargerVersion, useVerserVersion, useVersionsDocument } from '../../hooks/ged/useDocuments';
import { fr } from '../../utils/dateFr';
import { formatTailleFichier, getInfosTypeFichier } from '../../utils/ged/typeFichier';

interface Props {
  documentId: string;
  versionCouranteId?: string | null;
}

export function DocumentVersionsPanel({ documentId, versionCouranteId }: Props) {
  const { data: versions, isLoading } = useVersionsDocument(documentId);
  const verser = useVerserVersion(documentId);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Versions
          {versions && versions.length > 0 && <span className="ml-2 font-normal text-muted-foreground">{versions.length}</span>}
        </CardTitle>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          aria-label="Choisir le fichier de la nouvelle version"
          onChange={(e) => {
            const fichier = e.target.files?.[0];
            if (fichier) verser.mutate({ fichier });
            e.target.value = '';
          }}
        />
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={verser.isPending}>
          <Upload />
          {verser.isPending ? 'Envoi…' : 'Verser une nouvelle version'}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : (versions ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-[13px] text-muted-foreground">
            <History className="size-5" />
            Aucune version.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(versions ?? []).map((v) => {
              const { icone: Icone, couleur } = getInfosTypeFichier(v.type_mime, v.nom_fichier);
              return (
                <li key={v.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                    <Icone className="size-4" style={{ color: couleur }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 font-mono text-[12px] font-semibold">
                        v{v.version_majeure}.{v.version_mineure}
                      </span>
                      <span className="truncate text-[13px] font-medium" title={v.nom_fichier}>
                        {v.nom_fichier}
                      </span>
                      {v.id === versionCouranteId && <Badge variant="success">Courante</Badge>}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {formatTailleFichier(v.taille_octets)} · {fr(v.created_at).format('D MMM YYYY à HH:mm')}
                      {v.commentaire && <> · {v.commentaire}</>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => telechargerVersion(documentId, v.id, v.nom_fichier)}
                    aria-label={`Télécharger la version ${v.version_majeure}.${v.version_mineure}`}
                    title="Télécharger"
                  >
                    <Download />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
