import { DownloadOutlined, EyeOutlined, FolderOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Skeleton, Table, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { telechargerVersion, useInfosFichierDocuments } from '../../hooks/ged/useDocuments';
import { CLE_NON_CLASSES, useCompteurDocumentsParDossier, useDossiers } from '../../hooks/ged/useDossiers';
import { useRechercheDocuments } from '../../hooks/ged/useRechercheGed';
import type { RechercheDocumentsPayload } from '../../services/ged/recherche';
import type { Document } from '../../services/ged/documents';
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

  const {
    data: pageDocuments,
    isLoading,
    pagePleine,
  } = useRechercheDocuments(payload ?? {}, payload !== null, page);

  useEffect(() => {
    if (!pageDocuments) return;
    setDocumentsAccumules((precedent) => (page === 0 ? pageDocuments : [...precedent, ...pageDocuments]));
  }, [pageDocuments, page]);

  const { infosParVersionId } = useInfosFichierDocuments(documentsAccumules);

  const documentsTries = useMemo(() => {
    const copie = [...documentsAccumules];
    copie.sort((a, b) => {
      if (tri === 'nom') return a.titre.localeCompare(b.titre);
      if (tri === 'date') return new Date(b.date_archivage ?? b.date_versement).getTime() - new Date(a.date_archivage ?? a.date_versement).getTime();
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

  if (chargementInitial) return <Skeleton active />;

  if (estVide) {
    return (
      <Empty
        description={
          enRecherche
            ? 'Aucun document ne correspond à cette recherche.'
            : estNonClasses
              ? 'Aucun document non classé.'
              : 'Ce dossier est vide.'
        }
      />
    );
  }

  if (vue === 'liste') {
    return (
      <>
        <Table<GedDossierLigne | Document>
          rowKey={(r) => ('estDossier' in r ? `d-${r.id}` : `f-${r.id}`)}
          pagination={false}
          dataSource={[...sousDossiers.map((d) => ({ ...d, estDossier: true as const })), ...documentsTries]}
          onRow={(record) => ({
            onClick: () =>
              'estDossier' in record ? onNaviguerDossier(record.id) : onOuvrirDocument(record as Document),
            style: { cursor: 'pointer' },
          })}
          columns={[
            {
              title: 'Nom',
              render: (_, record) =>
                'estDossier' in record ? (
                  <span>
                    <FolderOutlined style={{ marginRight: 8 }} />
                    {record.libelle}
                  </span>
                ) : (
                  <NomDocument document={record as Document} infosParVersionId={infosParVersionId} />
                ),
            },
            {
              title: enRecherche ? 'Dossier' : 'Éléments',
              width: 200,
              render: (_, record) =>
                'estDossier' in record ? (
                  `${compteurs.get(record.id) ?? 0} fichier(s)`
                ) : enRecherche ? (
                  (record.dossier_id && dossierParId.get(record.dossier_id)?.libelle) || 'Non classé'
                ) : (
                  '—'
                ),
            },
            {
              title: "Date d'archivage",
              width: 140,
              render: (_, record) =>
                'estDossier' in record
                  ? '—'
                  : record.date_archivage
                    ? new Date(record.date_archivage).toLocaleDateString('fr-FR')
                    : '—',
            },
            {
              title: 'Taille',
              width: 100,
              render: (_, record) =>
                'estDossier' in record
                  ? '—'
                  : formatTailleFichier(
                      record.version_courante_id ? infosParVersionId.get(record.version_courante_id)?.taille_octets : null,
                    ),
            },
            {
              title: '',
              width: 90,
              render: (_, record) =>
                'estDossier' in record ? null : (
                  <Tooltip title="Télécharger">
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={(ev) => telecharger(record as Document, ev)}
                    />
                  </Tooltip>
                ),
            },
          ]}
        />
        {pagePleine && (
          <Button block style={{ marginTop: 12 }} loading={isLoading} onClick={() => setPage((p) => p + 1)}>
            Charger plus
          </Button>
        )}
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {sousDossiers.map((d) => (
          <Card key={d.id} hoverable size="small" onClick={() => onNaviguerDossier(d.id)}>
            <FolderOutlined style={{ fontSize: 32, color: '#faad14' }} />
            <div style={{ marginTop: 8 }}>
              <Tooltip title={d.libelle}>
                <Typography.Text strong ellipsis style={{ display: 'block' }}>
                  {d.libelle}
                </Typography.Text>
              </Tooltip>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {compteurs.get(d.id) ?? 0} fichier(s)
              </Typography.Text>
            </div>
          </Card>
        ))}

        {documentsTries.map((document) => {
          const infos = document.version_courante_id ? infosParVersionId.get(document.version_courante_id) : undefined;
          const { icone: Icone, couleur } = getInfosTypeFichier(infos?.type_mime, infos?.nom_fichier);
          return (
            <Card
              key={document.id}
              hoverable
              size="small"
              onClick={() => onOuvrirDocument(document)}
              actions={[
                <EyeOutlined key="voir" />,
                <DownloadOutlined key="telecharger" onClick={(ev) => telecharger(document, ev)} />,
              ]}
            >
              <Icone style={{ fontSize: 32, color: couleur }} />
              <div style={{ marginTop: 8 }}>
                <Tooltip title={document.titre}>
                  <Typography.Text strong ellipsis style={{ display: 'block' }}>
                    {document.titre}
                  </Typography.Text>
                </Tooltip>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {document.date_archivage ? new Date(document.date_archivage).toLocaleDateString('fr-FR') : '—'}
                  {' · '}
                  {formatTailleFichier(infos?.taille_octets)}
                </Typography.Text>
                {enRecherche && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {(document.dossier_id && dossierParId.get(document.dossier_id)?.libelle) || 'Non classé'}
                    </Typography.Text>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {pagePleine && (
        <Button block style={{ marginTop: 16 }} loading={isLoading} onClick={() => setPage((p) => p + 1)}>
          Charger plus
        </Button>
      )}
    </>
  );
}

type GedDossierLigne = { id: string; libelle: string; estDossier: true };

function NomDocument({
  document,
  infosParVersionId,
}: {
  document: Document;
  infosParVersionId: Map<string, { type_mime: string | null; nom_fichier: string }>;
}) {
  const infos = document.version_courante_id ? infosParVersionId.get(document.version_courante_id) : undefined;
  const { icone: Icone, couleur } = getInfosTypeFichier(infos?.type_mime, infos?.nom_fichier);
  return (
    <Tooltip title={document.titre}>
      <span>
        <Icone style={{ marginRight: 8, color: couleur }} />
        {document.titre}
      </span>
    </Tooltip>
  );
}
