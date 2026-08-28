import { ArrowLeftOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Popconfirm,
  Result,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocumentsVersement } from '../../hooks/ged/useDocuments';
import { useDossiers, useOptionsDossiersGed } from '../../hooks/ged/useDossiers';
import { useModifierVersement, useSoumettreVersement, useVersement } from '../../hooks/ged/useVersements';
import { useProfile } from '../../hooks/useProfile';
import type { Document } from '../../services/ged/documents';
import { ClassementPanel } from './ClassementPanel';
import { DocumentAjouterModal } from './DocumentAjouterModal';
import { GedWorkflowPanel } from './GedWorkflowPanel';

export function VersementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: versement, isLoading, isError } = useVersement(id);
  const { data: documents, isLoading: chargementDocuments } = useDocumentsVersement(id);
  const { data: dossiers } = useDossiers(organisationId);
  const optionsDossiers = useOptionsDossiersGed(organisationId);
  const soumettre = useSoumettreVersement(id);
  const modifier = useModifierVersement(id);
  const [ajouterOuvert, setAjouterOuvert] = useState(false);

  const dossierParId = useMemo(() => new Map((dossiers ?? []).map((d) => [d.id, d.libelle])), [dossiers]);

  if (isLoading || !organisationId) return <Skeleton active />;

  if (isError || !versement) {
    return (
      <Result
        status="404"
        title="Versement introuvable"
        subTitle="Ce versement n'existe pas ou vous n'y avez pas accès."
        extra={
          <Button type="primary" onClick={() => navigate('/ged')}>
            Retour à la GED
          </Button>
        }
      />
    );
  }

  const peutModifier = versement.redacteur_id === profile?.id || can('ged', 'modifier', versement.entite_id);
  const peutClasser = can('ged', 'modifier', versement.entite_id) && versement.etape_code === 'classement';
  const dossierCibleLibelle = versement.dossier_cible_id ? (dossierParId.get(versement.dossier_cible_id) ?? null) : null;
  const peutChoisirDossier = (versement.brouillon && peutModifier) || peutClasser;

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/ged')}>
          Retour
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {versement.objet}
        </Typography.Title>
        {versement.brouillon ? (
          <Tag>Brouillon</Tag>
        ) : (
          versement.etape_libelle && <Tag color="blue">{versement.etape_libelle}</Tag>
        )}
      </Space>

      <Card>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Dossier de classement cible">
            {peutChoisirDossier ? (
              <Select
                size="small"
                style={{ width: 220 }}
                value={versement.dossier_cible_id ?? undefined}
                placeholder="Aucun"
                allowClear
                loading={modifier.isPending}
                onChange={(v) => modifier.mutate({ dossier_cible_id: v ?? null })}
                options={optionsDossiers}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
              />
            ) : (
              (dossierCibleLibelle ?? '—')
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {versement.description || '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="Documents du versement"
        style={{ marginTop: 16 }}
        extra={
          versement.brouillon &&
          peutModifier && (
            <Button icon={<PlusOutlined />} onClick={() => setAjouterOuvert(true)}>
              Ajouter un document
            </Button>
          )
        }
      >
        <Table<Document>
          rowKey="id"
          loading={chargementDocuments}
          dataSource={documents}
          pagination={false}
          onRow={(record) => ({
            onClick: () => navigate(`/ged/documents/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <Empty description="Aucun document" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          columns={[
            { title: 'Titre', dataIndex: 'titre' },
            {
              title: 'Dossier',
              render: (_, d) => (d.dossier_id ? (dossierParId.get(d.dossier_id) ?? '—') : '—'),
            },
            {
              title: 'Mots-clés',
              render: (_, d) => (d.mots_cles ?? []).join(', ') || '—',
            },
          ]}
        />

        {versement.brouillon && (documents ?? []).length === 0 && (
          <Typography.Text type="secondary">
            Ajoutez au moins un document avant de soumettre le versement.
          </Typography.Text>
        )}

        {versement.brouillon && peutModifier && (
          <Popconfirm
            title="Soumettre ce versement à l'archiviste ?"
            onConfirm={() => soumettre.mutate()}
            disabled={(documents ?? []).length === 0}
          >
            <Button
              type="primary"
              icon={<SendOutlined />}
              style={{ marginTop: 12 }}
              loading={soumettre.isPending}
              disabled={(documents ?? []).length === 0}
            >
              Soumettre
            </Button>
          </Popconfirm>
        )}
      </Card>

      {!versement.brouillon && <GedWorkflowPanel versement={versement} organisationId={organisationId} />}

      {peutClasser && (
        <ClassementPanel
          organisationId={organisationId}
          documents={documents ?? []}
          dossierCibleId={versement.dossier_cible_id}
          dossierCibleLibelle={dossierCibleLibelle}
        />
      )}

      <DocumentAjouterModal
        open={ajouterOuvert}
        organisationId={organisationId}
        versementId={versement.id}
        onClose={() => setAjouterOuvert(false)}
        onAjoute={() => setAjouterOuvert(false)}
      />
    </div>
  );
}
