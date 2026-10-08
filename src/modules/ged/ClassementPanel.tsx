import { Check, FolderPlus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useOptionsDossiersGed } from '../../hooks/ged/useDossiers';
import { useClasserDocument } from '../../hooks/ged/useDocuments';
import type { Document } from '../../services/ged/documents';
import type { GedDossier } from '../../services/ged/dossiers';
import { DossierFormModal } from './DossierFormModal';

interface Props {
  organisationId: string;
  documents: Document[];
  dossierCibleId: string | null;
  dossierCibleLibelle: string | null;
}

interface LigneEdition {
  titre: string;
  dossierId: string;
  motsCles: string;
}

// Classement documentaire (étape de l'archiviste, GED V2 §9) : renommage,
// dossier définitif (plan de classement, ged_dossiers) et mots-clés
// d'indexation, document par document — le dossier cible du versement n'est
// qu'une proposition par défaut, ajustable ici pour chaque document. Si le
// dossier voulu n'existe pas encore, l'archiviste peut le créer à la volée.
export function ClassementPanel({ organisationId, documents, dossierCibleId, dossierCibleLibelle }: Props) {
  const optionsDossiers = useOptionsDossiersGed(organisationId);
  const classer = useClasserDocument();
  const [editions, setEditions] = useState<Record<string, LigneEdition>>({});
  const [nouveauDossierPour, setNouveauDossierPour] = useState<string | null>(null);
  const [enCoursId, setEnCoursId] = useState<string | null>(null);

  const ligneDe = (d: Document): LigneEdition =>
    editions[d.id] ?? {
      titre: d.titre,
      dossierId: d.dossier_id ?? dossierCibleId ?? '',
      motsCles: (d.mots_cles ?? []).join(', '),
    };

  const majLigne = (documentId: string, patch: Partial<LigneEdition>, document: Document) => {
    setEditions((prev) => ({ ...prev, [documentId]: { ...ligneDe(document), ...prev[documentId], ...patch } }));
  };

  const nbClasses = documents.filter((d) => d.dossier_id).length;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Classement documentaire</CardTitle>
          <CardDescription className="mt-1">
            Dossier proposé par le versement : <Badge variant="muted">{dossierCibleLibelle ?? 'Non défini'}</Badge> — repris
            par défaut, ajustable pour chaque document. Chaque document doit être classé avant d'archiver le versement.
          </CardDescription>
        </div>
        <Badge variant={nbClasses === documents.length && documents.length > 0 ? 'success' : 'outline'} shape="pill" className="shrink-0">
          {nbClasses} / {documents.length} classé{nbClasses > 1 ? 's' : ''}
        </Badge>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {documents.map((d, i) => {
            const ligne = ligneDe(d);
            return (
              <li key={d.id} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Document {i + 1}</span>
                  {d.dossier_id && (
                    <Badge variant="success" shape="pill">
                      <Check />
                      Classé
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label htmlFor={`titre-${d.id}`} className="mb-1.5 block text-[13px] font-medium">
                      Titre
                    </label>
                    <Input id={`titre-${d.id}`} value={ligne.titre} onChange={(e) => majLigne(d.id, { titre: e.target.value }, d)} />
                  </div>
                  <div>
                    <label htmlFor={`dossier-${d.id}`} className="mb-1.5 block text-[13px] font-medium">
                      Dossier (plan de classement)
                    </label>
                    <div className="flex gap-2">
                      <NativeSelect
                        id={`dossier-${d.id}`}
                        className="min-w-0 flex-1"
                        value={ligne.dossierId}
                        onChange={(e) => majLigne(d.id, { dossierId: e.target.value }, d)}
                      >
                        <option value="">Non classé</option>
                        {optionsDossiers.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-10 shrink-0"
                        title="Créer un nouveau dossier"
                        aria-label="Créer un nouveau dossier"
                        onClick={() => setNouveauDossierPour(d.id)}
                      >
                        <FolderPlus />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`mots-${d.id}`} className="mb-1.5 block text-[13px] font-medium">
                      Mots-clés
                    </label>
                    <Input
                      id={`mots-${d.id}`}
                      value={ligne.motsCles}
                      onChange={(e) => majLigne(d.id, { motsCles: e.target.value }, d)}
                      placeholder="Séparés par des virgules"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant={d.dossier_id ? 'outline' : 'default'}
                    disabled={classer.isPending}
                    onClick={() => {
                      setEnCoursId(d.id);
                      classer.mutate(
                        {
                          p_document_id: d.id,
                          p_titre: ligne.titre || null,
                          p_dossier_id: ligne.dossierId || null,
                          p_mots_cles: ligne.motsCles
                            .split(',')
                            .map((m) => m.trim())
                            .filter((m) => m.length > 0),
                        },
                        { onSettled: () => setEnCoursId(null) },
                      );
                    }}
                  >
                    <Check />
                    {classer.isPending && enCoursId === d.id ? 'Classement…' : d.dossier_id ? 'Mettre à jour' : 'Classer'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>

      <DossierFormModal
        open={nouveauDossierPour !== null}
        organisationId={organisationId}
        parentDossierId={dossierCibleId}
        onClose={() => setNouveauDossierPour(null)}
        onCree={(nouveauDossier: GedDossier) => {
          const documentId = nouveauDossierPour;
          if (documentId) {
            const document = documents.find((d) => d.id === documentId);
            if (document) majLigne(documentId, { dossierId: nouveauDossier.id }, document);
          }
        }}
      />
    </Card>
  );
}
