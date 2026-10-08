import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { useEffect } from 'react';
import { obtenirUrlObjet } from '../../config/apiClient';
import type { Document } from '../../services/ged/documents';
import { telechargerVersion, useInfosFichierDocuments } from '../../hooks/ged/useDocuments';
import { useTracerConsultation } from '../../hooks/ged/useConsultations';
import { fr } from '../../utils/dateFr';
import { formatTailleFichier, getInfosTypeFichier } from '../../utils/ged/typeFichier';

interface Props {
  document: Document | null;
  onClose: () => void;
}

// Consultation depuis l'explorateur Archives : PDF/image prévisualisés
// directement (iframe/img sur une URL signée, aucune dépendance ajoutée) ;
// les autres formats affichent leurs informations avec un bouton de
// téléchargement — un aperçu Office via un service tiers enverrait l'URL
// signée d'un document potentiellement confidentiel hors de l'application,
// donc volontairement écarté (cf. Refonte de la page Archives §6, repli prévu).
export function DocumentPreviewModal({ document, onClose }: Props) {
  useTracerConsultation(document?.id);
  const { infosParVersionId, isLoading: chargementInfos } = useInfosFichierDocuments(document ? [document] : []);
  const infos = document?.version_courante_id ? infosParVersionId.get(document.version_courante_id) : undefined;

  const { data: urlSignee, isLoading: chargementUrl } = useQuery({
    queryKey: ['ged-url-objet', infos?.id],
    queryFn: () => obtenirUrlObjet(`/ged/versions/${infos!.id}/telecharger`),
    enabled: Boolean(infos?.id),
  });

  // L'URL objet est locale au navigateur (créée par obtenirUrlObjet) : la
  // révoquer à la destruction de l'aperçu évite une fuite mémoire.
  useEffect(() => {
    return () => {
      if (urlSignee) URL.revokeObjectURL(urlSignee);
    };
  }, [urlSignee]);

  if (!document) return null;

  const { categorie, icone: Icone, couleur, libelle } = getInfosTypeFichier(infos?.type_mime, infos?.nom_fichier);
  const chargement = chargementInfos || (Boolean(infos) && chargementUrl);
  const apercu = (categorie === 'pdf' || categorie === 'image') && urlSignee;

  const telecharger = () => {
    if (!infos) return;
    void telechargerVersion(document.id, infos.id, infos.nom_fichier);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate">{document.titre}</DialogTitle>
          <DialogDescription>
            {libelle}
            {infos?.taille_octets != null && ` · ${formatTailleFichier(infos.taille_octets)}`}
            {document.date_archivage && ` · archivé le ${fr(document.date_archivage).format('D MMMM YYYY')}`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className={apercu ? 'bg-muted/50 p-3' : undefined}>
          {chargement ? (
            <Skeleton className="h-[60vh] w-full" />
          ) : categorie === 'pdf' && urlSignee ? (
            <iframe src={urlSignee} title={document.titre} className="h-[70vh] w-full rounded-md border-0 bg-white" />
          ) : categorie === 'image' && urlSignee ? (
            <img src={urlSignee} alt={document.titre} className="mx-auto block max-h-[70vh] max-w-full rounded-md" />
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="grid size-16 place-items-center rounded-xl bg-muted">
                <Icone className="size-8" style={{ color: couleur }} aria-hidden />
              </div>
              <div className="mt-4 break-all font-medium">{infos?.nom_fichier ?? document.titre}</div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Aperçu non disponible pour ce format ({libelle}). Téléchargez le fichier pour l'ouvrir.
              </p>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={telecharger} disabled={!infos}>
            <Download />
            Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
