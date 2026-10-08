import { Download, FileText, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tableau } from '../../components/ui/tableau';
import { ouvrirFichier } from '../../config/apiClient';
import { useDocumentsMarche } from '../../hooks/marches/useDocumentsMarche';
import { useMarcheCandidats } from '../../hooks/marches/useMarcheCandidats';
import { usePhasesMarche } from '../../hooks/marches/usePhasesMarche';
import { message } from '../../lib/notifications';
import { getUrlTelechargementDocument, type Document } from '../../services/marches/documents';
import { fr } from '../../utils/dateFr';
import { DocumentMarcheAjouterModal } from './DocumentMarcheAjouterModal';

interface Props {
  marcheId: string;
  peutModifier: boolean;
}

// §9 Espace documentaire du marché : ajout + consultation.
export function MarcheDocumentsTab({ marcheId, peutModifier }: Props) {
  const { data: documents, isLoading } = useDocumentsMarche(marcheId);
  const { data: phases } = usePhasesMarche(marcheId);
  const { data: candidats } = useMarcheCandidats(marcheId);
  const [formOuvert, setFormOuvert] = useState(false);

  const phaseParId = useMemo(() => new Map((phases ?? []).map((p) => [p.id, p.nom])), [phases]);
  const candidatParId = useMemo(() => new Map((candidats ?? []).map((c) => [c.id, c.nom])), [candidats]);

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
          libelle="Documents du marché"
          lignes={documents}
          cleLigne={(d) => d.id}
          chargement={isLoading}
          minLargeur={640}
          vide={{ icone: FileText, titre: 'Aucun document', description: 'Déposez ici les pièces du marché (dossier d’appel, offres, PV, justificatifs…).' }}
          colonnes={[
            {
              cle: 'titre',
              titre: 'Titre',
              rendu: (d) => (
                <span className="flex items-center gap-2.5">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block font-medium">{d.titre}</span>
                    {(d.phase_marche_id || d.marche_candidat_id) && (
                      <span className="block text-[12px] text-muted-foreground">
                        {d.phase_marche_id
                          ? `Phase : ${phaseParId.get(d.phase_marche_id) ?? '—'}`
                          : `Candidat : ${candidatParId.get(d.marche_candidat_id!) ?? '—'}`}
                      </span>
                    )}
                  </span>
                </span>
              ),
            },
            {
              cle: 'date',
              titre: 'Ajouté le',
              className: 'w-36 whitespace-nowrap tabular-nums',
              rendu: (d) => fr(d.created_at).format('D MMM YYYY'),
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
      <DocumentMarcheAjouterModal open={formOuvert} marcheId={marcheId} phases={phases} candidats={candidats} onClose={() => setFormOuvert(false)} />
    </Card>
  );
}
