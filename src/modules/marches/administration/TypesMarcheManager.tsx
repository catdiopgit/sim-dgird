import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { usePhaseTypeMarcheMutations, usePhasesTypeMarche, useTypeMarcheMutations, useTypesMarche } from '../../../hooks/marches/useTypesMarche';
import type { PhaseTypeMarche, TypeMarche } from '../../../services/marches/typesMarche';
import { PhaseTypeMarcheFormModal } from './PhaseTypeMarcheFormModal';
import { TypeMarcheFormModal } from './TypeMarcheFormModal';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

function PhasesDuType({ typeMarcheId, peutModifier }: { typeMarcheId: string; peutModifier: boolean }) {
  const { data: phases, isLoading } = usePhasesTypeMarche(typeMarcheId);
  const { remove } = usePhaseTypeMarcheMutations(typeMarcheId);
  const [phaseEnEdition, setPhaseEnEdition] = useState<PhaseTypeMarche | 'nouvelle' | null>(null);

  return (
    <div style={{ padding: '8px 24px' }}>
      {peutModifier && (
        <Button size="small" icon={<PlusOutlined />} style={{ marginBottom: 8 }} onClick={() => setPhaseEnEdition('nouvelle')}>
          Ajouter une phase
        </Button>
      )}
      <Table<PhaseTypeMarche>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={phases}
        pagination={false}
        columns={[
          { title: 'Ordre', dataIndex: 'ordre', width: 70 },
          { title: 'Phase', dataIndex: 'nom' },
          { title: 'Durée', width: 140, render: (_, p) => `${p.duree} ${p.unite_duree}(s)` },
          { title: 'Obligatoire', width: 100, render: (_, p) => (p.obligatoire ? <Tag>Oui</Tag> : <Tag color="default">Non</Tag>) },
          { title: 'Actif', width: 90, render: (_, p) => (p.actif ? <Tag color="green">Actif</Tag> : <Tag>Inactif</Tag>) },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 140,
                  render: (_: unknown, p: PhaseTypeMarche) => (
                    <span>
                      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setPhaseEnEdition(p)} />
                      <Popconfirm title="Supprimer cette phase ?" onConfirm={() => remove.mutate(p.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </span>
                  ),
                },
              ]
            : []),
        ]}
      />
      <PhaseTypeMarcheFormModal
        open={phaseEnEdition !== null}
        typeMarcheId={typeMarcheId}
        phase={phaseEnEdition === 'nouvelle' ? null : phaseEnEdition}
        onClose={() => setPhaseEnEdition(null)}
      />
    </div>
  );
}

// §7 Paramétrage — types de marché et leurs phases, entièrement configurables
// depuis l'administration système, sans limite de nombre de types ni de phases.
export function TypesMarcheManager({ organisationId, peutModifier }: Props) {
  const { data: types, isLoading } = useTypesMarche();
  const { remove } = useTypeMarcheMutations();
  const [typeEnEdition, setTypeEnEdition] = useState<TypeMarche | 'nouveau' | null>(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Typography.Text type="secondary">
          Chaque type de marché possède un ensemble ordonné de phases (dupliquées automatiquement à la création d'un marché de ce type).
        </Typography.Text>
        {peutModifier && (
          <Button icon={<PlusOutlined />} onClick={() => setTypeEnEdition('nouveau')}>
            Nouveau type de marché
          </Button>
        )}
      </div>

      <Table<TypeMarche>
        rowKey="id"
        loading={isLoading}
        dataSource={types}
        expandable={{ expandedRowRender: (t) => <PhasesDuType typeMarcheId={t.id} peutModifier={peutModifier} /> }}
        columns={[
          { title: 'Code', dataIndex: 'code', width: 160 },
          { title: 'Libellé', dataIndex: 'libelle' },
          { title: 'Description', dataIndex: 'description', render: (v) => v ?? '—' },
          { title: 'Ordre', dataIndex: 'ordre', width: 80 },
          { title: 'Statut', width: 100, render: (_, t) => (t.actif ? <Tag color="green">Actif</Tag> : <Tag>Inactif</Tag>) },
          ...(peutModifier
            ? [
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 140,
                  render: (_: unknown, t: TypeMarche) => (
                    <Space>
                      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setTypeEnEdition(t)} />
                      <Popconfirm title="Supprimer ce type de marché ?" onConfirm={() => remove.mutate(t.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />

      <TypeMarcheFormModal
        open={typeEnEdition !== null}
        organisationId={organisationId}
        type={typeEnEdition === 'nouveau' ? null : typeEnEdition}
        onClose={() => setTypeEnEdition(null)}
      />
    </div>
  );
}
