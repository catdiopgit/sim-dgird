import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Popconfirm, Table } from 'antd';
import { useState } from 'react';
import { useAvenantMutations, useAvenants } from '../../hooks/projets/useAvenants';
import type { Avenant } from '../../services/projets/avenants';
import { AvenantFormModal } from './AvenantFormModal';

interface Props {
  projetId: string;
  peutModifier: boolean;
}

export function ProjetAvenantsTab({ projetId, peutModifier }: Props) {
  const { data: avenants, isLoading } = useAvenants(projetId);
  const { remove } = useAvenantMutations(projetId);
  const [avenantEnEdition, setAvenantEnEdition] = useState<Avenant | 'nouveau' | null>(null);

  return (
    <Card
      title="Avenants"
      extra={
        peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setAvenantEnEdition('nouveau')}>
            Ajouter un avenant
          </Button>
        )
      }
    >
      <Table<Avenant>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={avenants}
        pagination={false}
        onRow={(record) => ({ onClick: () => setAvenantEnEdition(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Référence', dataIndex: 'reference', width: 140 },
          {
            title: 'Date',
            width: 110,
            render: (_, a) => (a.date_avenant ? new Date(a.date_avenant).toLocaleDateString('fr-FR') : '—'),
          },
          { title: 'Objet', dataIndex: 'objet' },
          {
            title: 'Montant',
            width: 140,
            render: (_, a) => (a.montant != null ? `${a.montant.toLocaleString('fr-FR')} FCFA` : '—'),
          },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 100,
                  render: (_: unknown, a: Avenant) => (
                    <span onClick={(e) => e.stopPropagation()}>
                      <Popconfirm title="Supprimer cet avenant ?" onConfirm={() => remove.mutate(a.id)}>
                        <Button type="link" size="small" danger>
                          Supprimer
                        </Button>
                      </Popconfirm>
                    </span>
                  ),
                },
              ]
            : []),
        ]}
      />
      <AvenantFormModal
        open={avenantEnEdition !== null}
        projetId={projetId}
        avenant={avenantEnEdition === 'nouveau' ? null : avenantEnEdition}
        onClose={() => setAvenantEnEdition(null)}
      />
    </Card>
  );
}
