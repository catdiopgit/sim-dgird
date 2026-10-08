import { message } from '../../lib/notifications';
import { Download, FileText, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ouvrirFichier } from '../../config/apiClient';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tableau } from '../../components/ui/tableau';
import { useDocumentsProjet } from '../../hooks/projets/useDocumentsProjet';
import { useLivrables } from '../../hooks/projets/useLivrables';
import { getUrlTelechargementDocument, type Document } from '../../services/projets/documents';
import type { ProjetsReferentiel } from '../../services/projets/referentiel';
import { fr } from '../../utils/dateFr';
import { DocumentProjetAjouterModal } from './DocumentProjetAjouterModal';
import { BadgeValeur } from './projetAffichage';

interface Props {
  projetId: string;
  peutModifier: boolean;
  referentiel: ProjetsReferentiel | undefined;
  utilisateurParId: Map<string, string>;
}

// §6 Espace documentaire du projet : ajout + consultation uniquement (le
// cahier des charges ne demande ni édition ni suppression depuis cet onglet).
export function ProjetDocumentsTab({ projetId, peutModifier, referentiel, utilisateurParId }: Props) {
  const { data: documents, isLoading } = useDocumentsProjet(projetId);
  const { data: livrables } = useLivrables(projetId);
  const [formOuvert, setFormOuvert] = useState(false);

  const typeParId = useMemo(() => new Map((referentiel?.typesDocument ?? []).map((v) => [v.id, v])), [referentiel]);
  const livrableParId = useMemo(() => new Map((livrables ?? []).map((l) => [l.id, l.nom])), [livrables]);

  const telecharger = async (document: Document) => {
    const url = await getUrlTelechargementDocument(document);
    if (!url) {
      message.error('Aucun fichier disponible pour ce document.');
      return;
    }
    await ouvrirFichier(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Documents
          {documents && documents.length > 0 && <span className="ml-2 font-normal text-muted-foreground">{documents.length}</span>}
        </CardTitle>
        {peutModifier && (
          <Button variant="outline" size="sm" onClick={() => setFormOuvert(true)}>
            <Plus />
            Ajouter un document
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tableau<Document>
          libelle="Documents du projet"
          lignes={documents}
          cleLigne={(d) => d.id}
          chargement={isLoading}
          minLargeur={720}
          vide={{ icone: FileText, titre: 'Aucun document', description: 'Déposez ici les pièces du projet (contrats, rapports, justificatifs…).' }}
          colonnes={[
            {
              cle: 'titre',
              titre: 'Titre',
              rendu: (d) => (
                <span className="flex items-center gap-2.5">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{d.titre}</span>
                </span>
              ),
            },
            {
              cle: 'type',
              titre: 'Type',
              className: 'w-40',
              rendu: (d) => <BadgeValeur valeur={d.type_projet_valeur_id ? typeParId.get(d.type_projet_valeur_id) : null} />,
            },
            {
              cle: 'livrable',
              titre: 'Livrable associé',
              className: 'w-44',
              rendu: (d) =>
                d.livrable_id ? (livrableParId.get(d.livrable_id) ?? '—') : <span className="text-muted-foreground">—</span>,
            },
            {
              cle: 'depot',
              titre: 'Dépôt',
              className: 'w-44',
              rendu: (d) => (
                <div>
                  <div>{d.created_by ? (utilisateurParId.get(d.created_by) ?? '—') : '—'}</div>
                  <div className="text-[12px] tabular-nums text-muted-foreground">{fr(d.created_at).format('D MMM YYYY')}</div>
                </div>
              ),
            },
            {
              cle: 'actions',
              titre: <span className="sr-only">Actions</span>,
              className: 'w-14',
              rendu: (d) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => void telecharger(d)}
                  aria-label={`Télécharger ${d.titre}`}
                  title="Télécharger"
                >
                  <Download />
                </Button>
              ),
            },
          ]}
        />
      </CardContent>
      <DocumentProjetAjouterModal
        open={formOuvert}
        projetId={projetId}
        referentiel={referentiel}
        livrables={livrables}
        onClose={() => setFormOuvert(false)}
      />
    </Card>
  );
}
