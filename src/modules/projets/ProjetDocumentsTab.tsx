import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Table, Tag, message } from 'antd';
import { useMemo, useState } from 'react';
import { useDocumentsProjet } from '../../hooks/projets/useDocumentsProjet';
import { useLivrables } from '../../hooks/projets/useLivrables';
import { ouvrirFichier } from '../../config/apiClient';
import { getUrlTelechargementDocument, type Document } from '../../services/projets/documents';
import type { ProjetsReferentiel } from '../../services/projets/referentiel';
import { DocumentProjetAjouterModal } from './DocumentProjetAjouterModal';

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
    <Card
      title="Documents"
      extra={
        peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setFormOuvert(true)}>
            Ajouter un document
          </Button>
        )
      }
    >
      <Table<Document>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={documents}
        pagination={false}
        columns={[
          { title: 'Titre', dataIndex: 'titre' },
          {
            title: 'Type',
            width: 160,
            render: (_, d) => {
              const t = d.type_projet_valeur_id ? typeParId.get(d.type_projet_valeur_id) : null;
              return t ? <Tag color={t.couleur ?? undefined}>{t.libelle}</Tag> : '—';
            },
          },
          {
            title: 'Livrable associé',
            width: 180,
            render: (_, d) => (d.livrable_id ? (livrableParId.get(d.livrable_id) ?? '—') : '—'),
          },
          {
            title: 'Déposé par',
            width: 160,
            render: (_, d) => (d.created_by ? (utilisateurParId.get(d.created_by) ?? '—') : '—'),
          },
          {
            title: 'Ajouté le',
            width: 120,
            render: (_, d) => new Date(d.created_at).toLocaleDateString('fr-FR'),
          },
          {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, d) => (
              <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => void telecharger(d)}>
                Télécharger
              </Button>
            ),
          },
        ]}
      />
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
