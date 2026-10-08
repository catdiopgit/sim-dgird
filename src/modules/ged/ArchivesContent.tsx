import { Download, Folder, FolderOpen, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { EtatVide } from '../../components/ui/page-header';
import { Skeleton } from '../../components/ui/skeleton';
import { telechargerVersion, useInfosFichierDocuments } from '../../hooks/ged/useDocuments';
import { CLE_NON_CLASSES, useCompteurDocumentsParDossier, useDossiers } from '../../hooks/ged/useDossiers';
import { useRechercheDocuments } from '../../hooks/ged/useRechercheGed';
import type { Document } from '../../services/ged/documents';
import type { RechercheDocumentsPayload } from '../../services/ged/recherche';
import { fr } from '../../utils/dateFr';
import { formatTailleFichier, getInfosTypeFichier } from '../../utils/ged/typeFichier';
import type { TriArchives, VueArchives } from './ArchivesToolbar';

interface Props {
  organisationId: string;
  dossierSelectionneId: string | null;
  onNaviguerDossier: (id: string) => void;
  texteRecherche: string;
  vue: VueArchives;
  tri: TriArchives;
  onOuvrirDocument: (document: Document) => void;
}

const nbFichiers = (n: number) => `${n} fichier${n > 1 ? 's' : ''}`;

export function ArchivesContent({
  organisationId,
  dossierSelectionneId,
  onNaviguerDossier,
  texteRecherche,
  vue,
  tri,
  onOuvrirDocument,
}: Props) {
  const { data: dossiers } = useDossiers(organisationId);
  const { compteurs } = useCompteurDocumentsParDossier(organisationId);

  const enRecherche = texteRecherche.trim().length > 0;
  const estNonClasses = !enRecherche && dossierSelectionneId === CLE_NON_CLASSES;
  const estRacine = !enRecherche && dossierSelectionneId === null;

  const dossierParId = useMemo(() => new Map((dossiers ?? []).map((d) => [d.id, d])), [dossiers]);

  // Les sous-dossiers viennent du plan de classement déjà chargé, jamais
  // d'une requête documents — à la racine, seuls les dossiers de premier
  // niveau apparaissent (les documents dossier_id=null vivent dans le
  // dossier virtuel "Non classés" du panneau gauche, pas ici).
  const sousDossiers = useMemo(() => {
    if (enRecherche || estNonClasses) return [];
    const parentId = estRacine ? null : dossierSelectionneId;
    return (dossiers ?? [])
      .filter((d) => d.parent_dossier_id === parentId)
      .sort((a, b) => a.libelle.localeCompare(b.libelle));
  }, [dossiers, enRecherche, estNonClasses, estRacine, dossierSelectionneId]);

  const cleVue = enRecherche
    ? `recherche:${texteRecherche}`
    : estNonClasses
      ? 'non_classes'
      : estRacine
        ? 'racine'
        : `dossier:${dossierSelectionneId}`;

  const [page, setPage] = useState(0);
  const [documentsAccumules, setDocumentsAccumules] = useState<Document[]>([]);
  useEffect(() => {
    setPage(0);
    setDocumentsAccumules([]);
  }, [cleVue]);

  const payload: RechercheDocumentsPayload | null = enRecherche
    ? { p_texte: texteRecherche }
    : estNonClasses
      ? { p_seulement_non_classes: true }
      : estRacine
        ? null
        : { p_dossier_id: dossierSelectionneId };

  const { data: pageDocuments, isLoading, pagePleine } = useRechercheDocuments(payload ?? {}, payload !== null, page);

  useEffect(() => {
    if (!pageDocuments) return;
    setDocumentsAccumules((precedent) => (page === 0 ? pageDocuments : [...precedent, ...pageDocuments]));
  }, [pageDocuments, page]);

  const { infosParVersionId } = useInfosFichierDocuments(documentsAccumules);

  const documentsTries = useMemo(() => {
    const copie = [...documentsAccumules];
    copie.sort((a, b) => {
      if (tri === 'nom') return a.titre.localeCompare(b.titre);
      if (tri === 'date')
        return (
          new Date(b.date_archivage ?? b.date_versement).getTime() - new Date(a.date_archivage ?? a.date_versement).getTime()
        );
      const infosA = a.version_courante_id ? infosParVersionId.get(a.version_courante_id) : undefined;
      const infosB = b.version_courante_id ? infosParVersionId.get(b.version_courante_id) : undefined;
      if (tri === 'taille') return (infosB?.taille_octets ?? 0) - (infosA?.taille_octets ?? 0);
      return getInfosTypeFichier(infosA?.type_mime, infosA?.nom_fichier).libelle.localeCompare(
        getInfosTypeFichier(infosB?.type_mime, infosB?.nom_fichier).libelle,
      );
    });
    return copie;
  }, [documentsAccumules, tri, infosParVersionId]);

  const chargementInitial = isLoading && page === 0 && documentsAccumules.length === 0;
  const estVide = !chargementInitial && sousDossiers.length === 0 && documentsTries.length === 0;

  const telecharger = async (document: Document, ev: React.MouseEvent) => {
    ev.stopPropagation();
    const infos = document.version_courante_id ? infosParVersionId.get(document.version_courante_id) : undefined;
    if (!infos) return;
    await telechargerVersion(document.id, infos.id, infos.nom_fichier);
  };

  const infosDe = (d: Document) => (d.version_courante_id ? infosParVersionId.get(d.version_courante_id) : undefined);
  const emplacement = (d: Document) => (d.dossier_id && dossierParId.get(d.dossier_id)?.libelle) || 'Non classé';
  const dateArchivage = (d: Document) => (d.date_archivage ? fr(d.date_archivage).format('DD/MM/YYYY') : '—');

  if (chargementInitial) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (estVide) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card">
        <EtatVide
          icone={enRecherche ? SearchX : FolderOpen}
          titre={
            enRecherche
              ? 'Aucun document ne correspond à cette recherche.'
              : estNonClasses
                ? 'Aucun document non classé.'
                : 'Ce dossier est vide.'
          }
        />
      </div>
    );
  }

  const chargerPlus = pagePleine && (
    <Button variant="outline" className="mt-4 w-full" disabled={isLoading} onClick={() => setPage((p) => p + 1)}>
      {isLoading ? 'Chargement…' : 'Charger plus'}
    </Button>
  );

  if (vue === 'liste') {
    return (
      <>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                <th className="py-3 pl-4 pr-4 font-medium">Nom</th>
                <th className="py-3 pr-4 font-medium">{enRecherche ? 'Dossier' : 'Éléments'}</th>
                <th className="py-3 pr-4 font-medium">Date d'archivage</th>
                <th className="py-3 pr-4 text-right font-medium">Taille</th>
                <th className="w-12" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {sousDossiers.map((d) => (
                <tr
                  key={`d-${d.id}`}
                  onClick={() => onNaviguerDossier(d.id)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/60"
                >
                  <td className="py-2.5 pl-4 pr-4">
                    <span className="flex items-center gap-2.5 font-medium">
                      <Folder className="size-4 shrink-0 fill-gold/25 text-gold" />
                      {d.libelle}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{nbFichiers(compteurs.get(d.id) ?? 0)}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">—</td>
                  <td className="py-2.5 pr-4 text-right text-muted-foreground">—</td>
                  <td />
                </tr>
              ))}
              {documentsTries.map((document) => {
                const infos = infosDe(document);
                const { icone: Icone, couleur } = getInfosTypeFichier(infos?.type_mime, infos?.nom_fichier);
                return (
                  <tr
                    key={`f-${document.id}`}
                    onClick={() => onOuvrirDocument(document)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/60"
                  >
                    <td className="max-w-[420px] py-2.5 pl-4 pr-4">
                      <span className="flex min-w-0 items-center gap-2.5" title={document.titre}>
                        <Icone className="size-4 shrink-0" style={{ color: couleur }} />
                        <span className="truncate">{document.titre}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{enRecherche ? emplacement(document) : '—'}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">{dateArchivage(document)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                      {formatTailleFichier(infos?.taille_octets)}
                    </td>
                    <td className="pr-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(ev) => telecharger(document, ev)}
                        aria-label={`Télécharger ${document.titre}`}
                        title="Télécharger"
                      >
                        <Download />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {chargerPlus}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {sousDossiers.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onNaviguerDossier(d.id)}
            className="group flex cursor-pointer flex-col rounded-xl border border-border bg-card p-4 text-left transition hover:border-input hover:shadow-sm"
          >
            <Folder className="size-9 fill-gold/25 text-gold" strokeWidth={1.5} />
            <span className="mt-3 truncate text-[13px] font-semibold" title={d.libelle}>
              {d.libelle}
            </span>
            <span className="text-[12px] text-muted-foreground">{nbFichiers(compteurs.get(d.id) ?? 0)}</span>
          </button>
        ))}

        {documentsTries.map((document) => {
          const infos = infosDe(document);
          const { icone: Icone, couleur, libelle } = getInfosTypeFichier(infos?.type_mime, infos?.nom_fichier);
          return (
            <div
              key={document.id}
              role="button"
              tabIndex={0}
              onClick={() => onOuvrirDocument(document)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOuvrirDocument(document);
                }
              }}
              className="group relative flex cursor-pointer flex-col rounded-xl border border-border bg-card p-4 text-left transition hover:border-input hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div className="flex items-start justify-between">
                <span
                  className="grid size-10 place-items-center rounded-lg"
                  style={{ background: `color-mix(in srgb, ${couleur} 12%, transparent)` }}
                >
                  <Icone className="size-5" style={{ color: couleur }} />
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-60 group-hover:opacity-100"
                  onClick={(ev) => telecharger(document, ev)}
                  aria-label={`Télécharger ${document.titre}`}
                  title="Télécharger"
                >
                  <Download />
                </Button>
              </div>
              <span className="mt-3 line-clamp-2 text-[13px] font-semibold leading-snug" title={document.titre}>
                {document.titre}
              </span>
              <span className="mt-1 text-[12px] text-muted-foreground">
                {libelle} · {formatTailleFichier(infos?.taille_octets)}
              </span>
              <span className="text-[12px] text-muted-foreground">{dateArchivage(document)}</span>
              {enRecherche && <span className="mt-1 truncate text-[12px] text-muted-foreground">{emplacement(document)}</span>}
            </div>
          );
        })}
      </div>
      {chargerPlus}
    </>
  );
}
