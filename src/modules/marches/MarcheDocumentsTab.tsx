import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Table, message } from 'antd';
import { useState } from 'react';
import { ouvrirFichier } from '../../config/apiClient';
import { useDocumentsMarche } from '../../hooks/marches/useDocumentsMarche';
import { useMarcheCandidats } from '../../hooks/marches/useMarcheCandidats';
import { usePhasesMarche } from '../../hooks/marches/usePhasesMarche';
import { getUrlTelechargementDocument, type Document } from '../../services/marches/documents';
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
      <DocumentMarcheAjouterModal
        open={formOuvert}
        marcheId={marcheId}
        phases={phases}
        candidats={candidats}
        onClose={() => setFormOuvert(false)}
      />
    </Card>
  );
}
