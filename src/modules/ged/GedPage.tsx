import { FolderOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Segmented, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBannetteGed } from '../../hooks/ged/useBannetteGed';
import { useMesBrouillons, useVersements } from '../../hooks/ged/useVersements';
import { useProfile } from '../../hooks/useProfile';
import type { GedVersement } from '../../services/ged/versements';
import { VersementFormModal } from './VersementFormModal';

type Vue = 'tous' | 'brouillons' | 'a_traiter';

// Le plan de classement (arbre des dossiers) n'est plus affiché ici : il se
// gère dans Administration > Paramétrage > Plan de classement, et se choisit
// document par document pendant le Classement (ClassementPanel) — pas besoin
// de le dupliquer sur la liste des versements.
export function GedPage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const [vue, setVue] = useState<Vue>('tous');
  const [versementFormOuvert, setVersementFormOuvert] = useState(false);

  const { data: versementsTous, isLoading: chargementTous } = useVersements(organisationId);
  const { data: brouillons, isLoading: chargementBrouillons } = useMesBrouillons(organisationId);
  const { data: aTraiter, isLoading: chargementATraiter } = useBannetteGed();

  const versements = vue === 'tous' ? versementsTous : vue === 'brouillons' ? brouillons : aTraiter;
  const isLoading = vue === 'tous' ? chargementTous : vue === 'brouillons' ? chargementBrouillons : chargementATraiter;

  const peutCreer = can('ged', 'creer');

  if (!organisationId) return <Skeleton active />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          GED
        </Typography.Title>
        <Space>
          <Button icon={<FolderOutlined />} onClick={() => navigate('/ged/archives')}>
            Archives
          </Button>
          {can('ged', 'consulter') && (
            <Button icon={<InboxOutlined />} onClick={() => navigate('/ged/archivage')}>
              Archivage
            </Button>
          )}
          {peutCreer && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setVersementFormOuvert(true)}>
              Nouveau versement
            </Button>
          )}
        </Space>
      </div>

      <Space style={{ marginBottom: 12 }}>
        <Segmented
          value={vue}
          onChange={(v) => setVue(v as Vue)}
          options={[
            { value: 'tous', label: 'Tous les versements' },
            { value: 'brouillons', label: 'Mes brouillons' },
            { value: 'a_traiter', label: 'À traiter' },
          ]}
        />
      </Space>

      <Table<GedVersement>
        rowKey="id"
        loading={isLoading}
        dataSource={versements}
        onRow={(record) => ({
          onClick: () => navigate(`/ged/versements/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'Objet', dataIndex: 'objet' },
          {
            title: 'Statut',
            render: (_, v) => (v.brouillon ? <Tag>Brouillon</Tag> : <Tag color="blue">{v.etape_libelle ?? '—'}</Tag>),
          },
          {
            title: 'Mis à jour le',
            dataIndex: 'updated_at',
            width: 140,
            render: (val: string) => new Date(val).toLocaleDateString('fr-FR'),
          },
        ]}
      />

      <VersementFormModal
        open={versementFormOuvert}
        organisationId={organisationId}
        onClose={() => setVersementFormOuvert(false)}
        onCree={(versement) => {
          setVersementFormOuvert(false);
          navigate(`/ged/versements/${versement.id}`);
        }}
      />
    </div>
  );
}
