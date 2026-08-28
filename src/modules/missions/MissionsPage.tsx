import { BarChartOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEntites } from '../../hooks/administration/useEntites';
import { useMissions } from '../../hooks/missions/useMissions';
import { useProfile } from '../../hooks/useProfile';
import type { Mission } from '../../services/missions/missions';
import { MissionFormModal } from './MissionFormModal';

export function MissionsPage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const [formOuvert, setFormOuvert] = useState(false);

  const { data: missions, isLoading } = useMissions(organisationId);
  const { data: entites } = useEntites(organisationId);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);

  const peutCreer = can('missions', 'creer');

  if (!organisationId) return <Skeleton active />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Missions
        </Typography.Title>
        <Space>
          <Button icon={<BarChartOutlined />} onClick={() => navigate('/missions/statistiques')}>
            Voir les statistiques
          </Button>
          {peutCreer && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOuvert(true)}>
              Nouvelle mission
            </Button>
          )}
        </Space>
      </div>

      <Table<Mission>
        rowKey="id"
        loading={isLoading}
        dataSource={missions}
        onRow={(record) => ({
          onClick: () => navigate(`/missions/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'Référence', dataIndex: 'reference', width: 160 },
          { title: 'Objet', dataIndex: 'objet' },
          {
            title: 'Entité',
            render: (_, m) => entiteParId.get(m.entite_id) ?? '—',
          },
          { title: 'Lieu', dataIndex: 'lieu', render: (v) => v ?? '—' },
          {
            title: 'Départ',
            width: 120,
            render: (_, m) => new Date(m.date_depart).toLocaleDateString('fr-FR'),
          },
          {
            title: 'Retour',
            width: 120,
            render: (_, m) => new Date(m.date_retour).toLocaleDateString('fr-FR'),
          },
          {
            title: 'Étape',
            width: 180,
            render: (_, m) => (m.etape_libelle ? <Tag color="blue">{m.etape_libelle}</Tag> : '—'),
          },
        ]}
      />

      <MissionFormModal
        open={formOuvert}
        organisationId={organisationId}
        onClose={() => setFormOuvert(false)}
        onCree={(mission) => {
          setFormOuvert(false);
          navigate(`/missions/${mission.id}`);
        }}
      />
    </div>
  );
}
