import { CheckCircle2, FolderInput } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Champ } from '../../components/form/champ';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useOptionsDossiersGed } from '../../hooks/ged/useDossiers';
import { useClasserVersement } from '../../hooks/ged/useVersements';
import type { GedVersement } from '../../services/ged/versements';

interface Props {
  organisationId: string;
  versement: GedVersement;
  nbDocuments: number;
}

// v8.6.4 — Classement du versement par l'archiviste (étape « En classement ») :
// il saisit le code d'archivage et choisit l'emplacement dans le plan ; le SIM
// crée sous cet emplacement le dossier du versement (code d'archivage +
// objet) et y range tous ses documents d'un coup. Un nouveau classement avant
// l'archivage met simplement ce dossier à jour.
export function ClassementPanel({ organisationId, versement, nbDocuments }: Props) {
  const options = useOptionsDossiersGed(organisationId, versement.dossier_cible_id).filter(
    (o) => o.value !== versement.dossier_versement_id,
  );
  const classer = useClasserVersement(versement.id);
  const [code, setCode] = useState(versement.code_archivage ?? '');
  const [emplacement, setEmplacement] = useState(versement.dossier_cible_id ?? '');

  useEffect(() => {
    setCode(versement.code_archivage ?? '');
    setEmplacement(versement.dossier_cible_id ?? '');
  }, [versement.code_archivage, versement.dossier_cible_id]);

  const classe = Boolean(versement.code_archivage && versement.dossier_versement_id);
  const valide = code.trim().length > 0 && emplacement.length > 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Classement du versement</CardTitle>
          <CardDescription className="mt-1">
            Saisissez le code d'archivage et choisissez l'emplacement dans le plan de classement. Le SIM y crée le dossier
            du versement et y range ses {nbDocuments} document{nbDocuments > 1 ? 's' : ''}.
          </CardDescription>
        </div>
        {classe && (
          <Badge variant="success" shape="pill" className="shrink-0">
            <CheckCircle2 />
            Classé
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valide) classer.mutate({ codeArchivage: code.trim(), dossierParentId: emplacement });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <Champ label="Code d'archivage" htmlFor="code-archivage" requis aide="Unique ; repris comme code du dossier.">
              <Input
                id="code-archivage"
                className="font-mono"
                maxLength={40}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex. DR/2026/015"
              />
            </Champ>
            <Champ label="Emplacement dans le plan" htmlFor="emplacement-plan" requis>
              <NativeSelect id="emplacement-plan" value={emplacement} onChange={(e) => setEmplacement(e.target.value)}>
                <option value="">Choisir…</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Champ>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!valide || classer.isPending}>
              <FolderInput />
              {classer.isPending ? 'Classement…' : classe ? 'Mettre à jour le classement' : 'Classer le versement'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
