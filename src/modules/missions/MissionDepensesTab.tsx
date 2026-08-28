import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Popconfirm, Space, Statistic, Table, message } from 'antd';
import { useState } from 'react';
import { useDepenseMutations, useDepensesMission } from '../../hooks/missions/useDepenses';
import { getDocumentParId, getUrlTelechargementDocument } from '../../services/missions/documents';
import type { MissionDepense } from '../../services/missions/depenses';
import { MissionDepenseFormModal } from './MissionDepenseFormModal';

interface Props {
  missionId: string;
  peutModifier: boolean;
  budgetPrevu: number | null;
  budgetReel: number | null;
}

export function MissionDepensesTab({ missionId, peutModifier, budgetPrevu, budgetReel }: Props) {
  const { data: depenses, isLoading } = useDepensesMission(missionId);
  const { supprimer } = useDepenseMutations(missionId);
  const [formOuvert, setFormOuvert] = useState(false);

  const telechargerJustificatif = async (depense: MissionDepense) => {
    if (!depense.justificatif_document_id) return;
    const document = await getDocumentParId(depense.justificatif_document_id);
    if (!document) {
      message.error('Justificatif introuvable.');
      return;
    }
    const url = await getUrlTelechargementDocument(document);
    if (!url) {
      message.error('Aucun fichier disponible pour ce justificatif.');
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <Card
      title="Dépenses"
      extra={
        peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setFormOuvert(true)}>
            Ajouter une dépense
          </Button>
        )
      }
    >
      <Space size="large" style={{ marginBottom: 16 }}>
        <Statistic title="Budget prévu" value={budgetPrevu ?? 0} precision={2} suffix="FCFA" />
        <Statistic title="Budget réel (dépenses)" value={budgetReel ?? 0} precision={2} suffix="FCFA" />
      </Space>

      <Table<MissionDepense>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={depenses}
        pagination={false}
        columns={[
          { title: 'Libellé', dataIndex: 'libelle' },
          { title: 'Montant', width: 140, render: (_, d) => `${d.montant.toLocaleString('fr-FR')} FCFA` },
          {
            title: 'Date',
            width: 120,
            render: (_, d) => new Date(d.date_depense).toLocaleDateString('fr-FR'),
          },
          {
            title: 'Justificatif',
            width: 140,
            render: (_, d) =>
              d.justificatif_document_id ? (
                <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => void telechargerJustificatif(d)}>
                  Télécharger
                </Button>
              ) : (
                '—'
              ),
          },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 100,
                  render: (_: unknown, d: MissionDepense) => (
                    <Popconfirm title="Supprimer cette dépense ?" onConfirm={() => supprimer.mutate(d.id)}>
                      <Button type="link" size="small" danger>
                        Supprimer
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]
            : []),
        ]}
      />
      <MissionDepenseFormModal open={formOuvert} missionId={missionId} onClose={() => setFormOuvert(false)} />
    </Card>
  );
}
