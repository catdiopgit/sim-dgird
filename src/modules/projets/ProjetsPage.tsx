import { BarChartOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Progress, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEntites } from '../../hooks/administration/useEntites';
import { useProjets, useProjetsReferentiel } from '../../hooks/projets/useProjets';
import { useProfile } from '../../hooks/useProfile';
import type { Projet } from '../../services/projets/projets';
import { ProjetFormModal } from './ProjetFormModal';

export function ProjetsPage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const [formOuvert, setFormOuvert] = useState(false);

  const { data: projets, isLoading } = useProjets(organisationId);
  const { data: referentiel } = useProjetsReferentiel(organisationId);
  const { data: entites } = useEntites(organisationId);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const statutParId = useMemo(() => new Map((referentiel?.statuts ?? []).map((v) => [v.id, v])), [referentiel]);
  const prioriteParId = useMemo(() => new Map((referentiel?.priorites ?? []).map((v) => [v.id, v])), [referentiel]);

  const peutCreer = can('projets', 'creer');

  if (!organisationId) return <Skeleton active />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Projets
        </Typography.Title>
        <Space>
          <Button icon={<BarChartOutlined />} onClick={() => navigate('/projets/statistiques')}>
            Voir les statistiques
          </Button>
          {peutCreer && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOuvert(true)}>
              Nouveau projet
            </Button>
          )}
        </Space>
      </div>

      <Table<Projet>
        rowKey="id"
        loading={isLoading}
        dataSource={projets}
        onRow={(record) => ({
          onClick: () => navigate(`/projets/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'Code', dataIndex: 'code', width: 140 },
          { title: 'Nom', dataIndex: 'nom' },
          {
            title: 'Entité',
            render: (_, p) => entiteParId.get(p.entite_id) ?? '—',
          },
          {
            title: 'Statut',
            render: (_, p) => {
              const s = p.statut_valeur_id ? statutParId.get(p.statut_valeur_id) : null;
              return s ? <Tag color={s.couleur ?? undefined}>{s.libelle}</Tag> : '—';
            },
          },
          {
            title: 'Priorité',
            render: (_, p) => {
              const pr = p.priorite_valeur_id ? prioriteParId.get(p.priorite_valeur_id) : null;
              return pr ? <Tag color={pr.couleur ?? undefined}>{pr.libelle}</Tag> : '—';
            },
          },
          {
            title: 'Avancement',
            width: 160,
            render: (_, p) => (
              <Progress percent={Math.round(p.avancement_pct)} size="small" status={p.avancement_pct >= 100 ? 'success' : 'active'} />
            ),
          },
          {
            title: 'Échéance',
            width: 120,
            render: (_, p) => (p.date_fin_prevue ? new Date(p.date_fin_prevue).toLocaleDateString('fr-FR') : '—'),
          },
          {
            title: 'Clôture',
            width: 130,
            render: (_, p) => {
              if (p.cloture_statut === 'confirmee') return <Tag color="green">Clôturé</Tag>;
              if (p.cloture_statut === 'demandee') return <Tag color="gold">En attente</Tag>;
              if (p.cloture_statut === 'rejetee') return <Tag color="red">Rejetée</Tag>;
              return '—';
            },
          },
        ]}
      />

      <ProjetFormModal
        open={formOuvert}
        organisationId={organisationId}
        onClose={() => setFormOuvert(false)}
        onCree={(projet) => {
          setFormOuvert(false);
          navigate(`/projets/${projet.id}`);
        }}
      />
    </div>
  );
}
