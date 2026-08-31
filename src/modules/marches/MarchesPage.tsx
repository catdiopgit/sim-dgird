import { BarChartOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEntites } from '../../hooks/administration/useEntites';
import { useMarches } from '../../hooks/marches/useMarches';
import { useTypesMarche } from '../../hooks/marches/useTypesMarche';
import { useProfile } from '../../hooks/useProfile';
import type { Marche } from '../../services/marches/marches';
import { MarcheFormModal } from './MarcheFormModal';

export function MarchesPage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const [formOuvert, setFormOuvert] = useState(false);

  const { data: marches, isLoading } = useMarches();
  const { data: types } = useTypesMarche();
  const { data: entites } = useEntites(organisationId);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const typeParId = useMemo(() => new Map((types ?? []).map((t) => [t.id, t.libelle])), [types]);

  const peutCreer = can('marches', 'creer');

  if (!organisationId) return <Skeleton active />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Marchés
        </Typography.Title>
        <Space>
          <Button icon={<BarChartOutlined />} onClick={() => navigate('/marches/statistiques')}>
            Voir les statistiques
          </Button>
          {peutCreer && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOuvert(true)}>
              Nouveau marché
            </Button>
          )}
        </Space>
      </div>

      <Table<Marche>
        rowKey="id"
        loading={isLoading}
        dataSource={marches}
        onRow={(record) => ({
          onClick: () => navigate(`/marches/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'Référence', dataIndex: 'reference', width: 160 },
          { title: 'Objet', dataIndex: 'objet' },
          { title: 'Type', render: (_, m) => typeParId.get(m.type_marche_id) ?? '—' },
          { title: 'Entité', render: (_, m) => entiteParId.get(m.entite_id) ?? '—' },
          {
            title: 'Début prévisionnel',
            width: 140,
            render: (_, m) => (m.date_debut_prevue ? new Date(m.date_debut_prevue).toLocaleDateString('fr-FR') : '—'),
          },
          {
            title: 'Fin prévisionnelle',
            width: 140,
            render: (_, m) => (m.date_fin_prevue ? new Date(m.date_fin_prevue).toLocaleDateString('fr-FR') : '—'),
          },
          {
            title: 'Statut',
            width: 120,
            render: (_, m) => (m.statut_cloture === 'cloture' ? <Tag color="green">Clôturé</Tag> : <Tag color="blue">En cours</Tag>),
          },
        ]}
      />

      <MarcheFormModal
        open={formOuvert}
        organisationId={organisationId}
        onClose={() => setFormOuvert(false)}
        onCree={(marche) => {
          setFormOuvert(false);
          navigate(`/marches/${marche.id}`);
        }}
      />
    </div>
  );
}
