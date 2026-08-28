import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Result, Skeleton, Space, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEntites } from '../../hooks/administration/useEntites';
import { useTracerConsultation } from '../../hooks/ged/useConsultations';
import { useDocument } from '../../hooks/ged/useDocuments';
import { useDossiers } from '../../hooks/ged/useDossiers';
import { useConfidentialitesGed } from '../../hooks/ged/useGedReferentiel';
import { useVersement } from '../../hooks/ged/useVersements';
import { useProfile } from '../../hooks/useProfile';
import { DocumentDroitsPanel } from './DocumentDroitsPanel';
import { DocumentVersionsPanel } from './DocumentVersionsPanel';

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  const { data: document, isLoading, isError } = useDocument(id);
  const { data: versement } = useVersement(document?.versement_id ?? undefined);
  const { data: entites } = useEntites(organisationId);
  const { data: dossiers } = useDossiers(organisationId);
  const { data: confidentialites } = useConfidentialitesGed(organisationId);
  useTracerConsultation(document?.id);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const dossierParId = useMemo(() => new Map((dossiers ?? []).map((d) => [d.id, d.libelle])), [dossiers]);
  const confidentialiteParId = useMemo(
    () => new Map((confidentialites ?? []).map((c) => [c.id, c])),
    [confidentialites],
  );

  if (isLoading || !organisationId) return <Skeleton active />;

  if (isError || !document) {
    return (
      <Result
        status="404"
        title="Document introuvable"
        subTitle="Ce document n'existe pas ou vous n'y avez pas accès."
        extra={
          <Button type="primary" onClick={() => navigate('/ged')}>
            Retour à la GED
          </Button>
        }
      />
    );
  }

  const peutGererDroits = can('ged', 'modifier', document.entite_id);
  const confidentialite = document.confidentialite_valeur_id
    ? confidentialiteParId.get(document.confidentialite_valeur_id)
    : null;

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/ged/versements/${document.versement_id}`)}>
          Retour au versement
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {document.titre}
        </Typography.Title>
        {versement?.etape_libelle && <Tag color="blue">{versement.etape_libelle}</Tag>}
      </Space>

      <Card>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Versement">{versement?.objet ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Dossier">
            {document.dossier_id ? (dossierParId.get(document.dossier_id) ?? '—') : 'Non classé'}
          </Descriptions.Item>
          <Descriptions.Item label="Entité">
            {document.entite_id ? (entiteParId.get(document.entite_id) ?? '—') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Confidentialité">
            {confidentialite ? <Tag color={confidentialite.couleur ?? undefined}>{confidentialite.libelle}</Tag> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Mots-clés">{(document.mots_cles ?? []).join(', ') || '—'}</Descriptions.Item>
          <Descriptions.Item label="Date de versement">
            {new Date(document.date_versement).toLocaleDateString('fr-FR')}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {document.description || '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <DocumentVersionsPanel documentId={document.id} />
      {peutGererDroits && <DocumentDroitsPanel documentId={document.id} organisationId={organisationId} />}
    </div>
  );
}
